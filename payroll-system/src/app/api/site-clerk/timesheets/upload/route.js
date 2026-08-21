import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// Initialize Gemini SDK with explicit API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const selectedSiteName = formData.get('siteName') || 'Site A';
    const fallbackShiftDate = formData.get('shiftDate') || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ error: 'No timesheet image uploaded.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not defined in environment variables.' },
        { status: 500 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(fileBuffer).toString('base64');
    const mimeType = file.type || 'image/png';

    // 1. Call active Gemini Vision Model
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.7-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      Extract all rows from this daily site timesheet image into JSON.
      Return JSON with this exact structure:
      {
        "siteName": "string or null",
        "documentDate": "YYYY-MM-DD or null",
        "workers": [
          {
            "workerName": "string",
            "idNumber": "string",
            "timeIn": "HH:MM AM/PM",
            "timeOut": "HH:MM AM/PM",
            "signature": "string"
          }
        ]
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText);
    const extractedWorkers = parsedJson.workers || [];
    const shiftDate = parsedJson.documentDate || fallbackShiftDate;

    // 2. Fetch DB Employees for Cross-Matching
    const { data: dbEmployees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, national_id, employee_code, assigned_site');

    // 3. Dynamic Calculation Helper
    const calculateHours = (timeInStr, timeOutStr) => {
      try {
        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (!match) return null;
          let [, hours, minutes, modifier] = match;
          hours = parseInt(hours, 10);
          minutes = parseInt(minutes, 10);
          if (modifier) {
            if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
          return hours + minutes / 60;
        };

        const start = parseTime(timeInStr);
        const end = parseTime(timeOutStr);
        if (start === null || end === null) return { reg: 8, ot: 0, isLate: false };

        const total = Math.max(0, end - start);
        const isLate = start > 7.25; // Clocked in after 07:15 AM
        const reg = Math.min(8, total);
        const ot = Math.max(0, total - 8);

        return { reg, ot, isLate };
      } catch {
        return { reg: 8, ot: 0, isLate: false };
      }
    };

    // 4. Map OCR Workers to Database Records
    const parsedWorkers = extractedWorkers.map((worker, index) => {
      const cleanName = (worker.workerName || 'Unknown Worker').trim();
      const nationalId = worker.idNumber ? worker.idNumber.trim() : null;
      const { reg, ot, isLate } = calculateHours(worker.timeIn, worker.timeOut);

      const match = (dbEmployees || []).find((emp) => {
        const dbFullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        return (
          (nationalId && emp.national_id === nationalId) ||
          dbFullName === cleanName.toLowerCase()
        );
      });

      return {
        id: match?.id || index + 1,
        employee_id: match?.id || null,
        worker_name: cleanName,
        national_id: nationalId,
        employee_code: match?.employee_code || `WALKON-${nationalId || index + 1}`,
        site_location: match?.assigned_site || selectedSiteName,
        timeInStr: worker.timeIn,
        timeOutStr: worker.timeOut,
        regular_hours: reg,
        overtime_hours: ot,
        status: 'completed',
        is_unregistered: !match,
        warnings: {
          is_late: isLate,
          not_in_database: !match,
        },
      };
    });

    // 5. Store File Attachment in Supabase Storage
    const fileName = `${selectedSiteName}_${shiftDate}_${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
    const { data: storageData } = await supabase.storage
      .from('timesheet-attachments')
      .upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });

    const { data: publicUrlData } = supabase.storage
      .from('timesheet-attachments')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      documentUrl: publicUrlData?.publicUrl || null,
      shiftDate,
      siteName: parsedJson.siteName || selectedSiteName,
      workerCount: parsedWorkers.length,
      parsedWorkers,
    });
  } catch (err) {
    console.error('Vision Ingestion Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process document with Gemini Vision.' },
      { status: 500 }
    );
  }
}