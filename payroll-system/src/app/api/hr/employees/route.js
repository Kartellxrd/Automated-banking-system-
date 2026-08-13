import { NextResponse } from 'next/server';

let employees = [
  {
    id: 'EMP-8802',
    name: 'Kago Phuthego',
    role: 'Heavy Machinery Operator',
    site: 'Jwaneng Pit B',
    rate: 'BWP 120.00/hr',
    status: 'Active',
    contact: 'kago@mineops.co.bw',
  },
  {
    id: 'EMP-4105',
    name: 'Thabo Mokoena',
    role: 'Underground Blaster',
    site: 'Orapa Shaft 3',
    rate: 'BWP 145.00/hr',
    status: 'Active',
    contact: 'thabo@mineops.co.bw',
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: employees }, { status: 200 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newEmployee = {
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      ...body,
      status: 'Active',
    };
    employees.unshift(newEmployee);

    return NextResponse.json({ success: true, data: newEmployee }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create employee profile' }, { status: 400 });
  }
}