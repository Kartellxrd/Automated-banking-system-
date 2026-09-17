import { NextResponse } from 'next/server';
import { requireCEO } from '@/lib/auth/requireCEO';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

export const dynamic = 'force-dynamic';
const num = (value) => Number(value || 0);

async function loadPaymentCenter(db) {
  const [payrollResult, expensesResult, runsResult, accountsResult] = await Promise.all([
    db.from('payroll_batches').select('id,batch_code,pay_period_id,status,scheduled_payment_date,total_employees,net_total,ceo_reviewed_at,submitted_at').eq('status', 'approved_by_ceo').order('scheduled_payment_date', { ascending: true, nullsFirst: false }),
    db.from('expense_requests').select('id,request_code,site_id,category_id,status,purpose,payment_type,vendor_name,operational_requester_name,approved_amount,approved_at,payee_id').eq('status', 'approved').order('approved_at'),
    db.from('payment_runs').select('id,run_code,run_type,payroll_batch_id,status,execution_mode,total_items,total_amount,prepared_at,authorized_by,authorized_at,source_payment_account_id,execution_started_at,execution_completed_at,created_at').neq('status','cancelled').order('created_at',{ascending:false}).limit(80),
    db.from('company_payment_accounts').select('id,account_name,institution_name,account_identifier_label,is_active'),
  ]);
  for (const r of [payrollResult, expensesResult, runsResult, accountsResult]) if (r.error) throw r.error;

  const payrollBatches = payrollResult.data || [];
  const expensesRaw = expensesResult.data || [];
  const runs = runsResult.data || [];
  const batchIds = [...new Set([...payrollBatches.map((r)=>r.id), ...runs.map((r)=>r.payroll_batch_id).filter(Boolean)])];
  const periodIds = [...new Set(payrollBatches.map((r)=>r.pay_period_id).filter(Boolean))];
  const siteIds = [...new Set(expensesRaw.map((r)=>r.site_id).filter(Boolean))];
  const categoryIds = [...new Set(expensesRaw.map((r)=>r.category_id).filter(Boolean))];
  const payeeIds = [...new Set(expensesRaw.map((r)=>r.payee_id).filter(Boolean))];
  const runIds = runs.map((r)=>r.id);

  const [entriesResult, periodsResult, sitesResult, categoriesResult, itemsResult, batchesResult, payeesResult, payoutProfilesResult, providersResult] = await Promise.all([
    payrollBatches.length ? db.from('payroll_entries').select('id,batch_id,net_pay,payout_provider_id,payout_provider_name_snapshot,payout_account_snapshot,payout_verified_at_snapshot').in('batch_id', payrollBatches.map((r)=>r.id)) : Promise.resolve({data:[],error:null}),
    periodIds.length ? db.from('pay_periods').select('id,period_name,start_date,end_date').in('id',periodIds) : Promise.resolve({data:[],error:null}),
    siteIds.length ? db.from('sites').select('id,site_name,location').in('id',siteIds) : Promise.resolve({data:[],error:null}),
    categoryIds.length ? db.from('expense_categories').select('id,category_name').in('id',categoryIds) : Promise.resolve({data:[],error:null}),
    runIds.length ? db.from('payment_run_items').select('id,payment_run_id,expense_request_id,amount,status,payment_reference,payment_error,paid_at').in('payment_run_id',runIds) : Promise.resolve({data:[],error:null}),
    batchIds.length ? db.from('payroll_batches').select('id,batch_code,pay_period_id,status,scheduled_payment_date,total_employees,net_total').in('id',batchIds) : Promise.resolve({data:[],error:null}),
    payeeIds.length ? db.from('expense_payees').select('id,payee_code,payee_type,display_name,is_active').in('id',payeeIds) : Promise.resolve({data:[],error:null}),
    payeeIds.length ? db.from('expense_payee_payout_profiles').select('id,payee_id,payout_provider_id,account_or_mobile_number,branch_code,is_primary,is_verified,verified_at').in('payee_id',payeeIds).eq('is_primary',true) : Promise.resolve({data:[],error:null}),
    db.from('payout_providers').select('id,name,code,is_active'),
  ]);
  for (const r of [entriesResult, periodsResult, sitesResult, categoriesResult, itemsResult, batchesResult, payeesResult, payoutProfilesResult, providersResult]) if (r.error) throw r.error;

  const periodMap = new Map((periodsResult.data||[]).map((r)=>[r.id,r]));
  const siteMap = new Map((sitesResult.data||[]).map((r)=>[r.id,r]));
  const categoryMap = new Map((categoriesResult.data||[]).map((r)=>[r.id,r]));
  const batchMap = new Map((batchesResult.data||[]).map((r)=>[r.id,r]));
  const payeeMap = new Map((payeesResult.data||[]).map((r)=>[r.id,r]));
  const providerMap = new Map((providersResult.data||[]).map((r)=>[r.id,r]));
  const payoutMap = new Map((payoutProfilesResult.data||[]).map((r)=>[r.payee_id,r]));
  const accountMap = new Map((accountsResult.data||[]).map((r)=>[r.id,r]));

  const entriesByBatch = new Map();
  for (const entry of entriesResult.data||[]) {
    if(!entriesByBatch.has(entry.batch_id)) entriesByBatch.set(entry.batch_id,[]);
    entriesByBatch.get(entry.batch_id).push({...entry,net_pay:num(entry.net_pay)});
  }

  const itemsByRun = new Map();
  for (const item of itemsResult.data||[]) {
    if(!itemsByRun.has(item.payment_run_id)) itemsByRun.set(item.payment_run_id,[]);
    itemsByRun.get(item.payment_run_id).push({...item,amount:num(item.amount)});
  }

  const payrollRunByBatch = new Map();
  const expenseRunByRequest = new Map();
  for (const run of runs) {
    if (run.run_type==='payroll' && run.payroll_batch_id && !payrollRunByBatch.has(run.payroll_batch_id)) payrollRunByBatch.set(run.payroll_batch_id,run);
    if (run.run_type==='expense') {
      for (const item of itemsByRun.get(run.id)||[]) {
        if (item.expense_request_id && !expenseRunByRequest.has(item.expense_request_id)) expenseRunByRequest.set(item.expense_request_id,run);
      }
    }
  }

  const payroll = payrollBatches.map((batch)=>{
    const entries=entriesByBatch.get(batch.id)||[];
    const payable=entries.filter((e)=>e.net_pay>0);
    const blockers=payable.filter((e)=>!(e.payout_provider_id&&e.payout_account_snapshot&&e.payout_verified_at_snapshot));
    const breakdown=new Map();
    for (const e of payable) {
      const key=e.payout_provider_name_snapshot||'Missing payout provider';
      const cur=breakdown.get(key)||{provider:key,recipients:0,amount:0};
      cur.recipients+=1;
      cur.amount+=e.net_pay;
      breakdown.set(key,cur);
    }
    const run = payrollRunByBatch.get(batch.id)||null;
    return {
      ...batch,
      net_total:num(batch.net_total),
      pay_period:periodMap.get(batch.pay_period_id)||null,
      payable_recipients:payable.length,
      payment_blockers:blockers.length,
      payment_ready:payable.length>0 && blockers.length===0 && Boolean(batch.scheduled_payment_date),
      payment_run:run,
      channel_breakdown:[...breakdown.values()].map((x)=>({...x,amount:Number(x.amount.toFixed(2))})),
    };
  });

  const expenses = expensesRaw.map((row)=>{
    const payee=row.payee_id?payeeMap.get(row.payee_id)||null:null;
    const profile=payee?payoutMap.get(payee.id)||null:null;
    const provider=profile?providerMap.get(profile.payout_provider_id)||null:null;
    const ready=Boolean(payee?.is_active && profile?.is_verified && profile?.verified_at && provider?.is_active);
    const masked=profile?.account_or_mobile_number ? (profile.account_or_mobile_number.length<=4?profile.account_or_mobile_number:`${'*'.repeat(profile.account_or_mobile_number.length-4)}${profile.account_or_mobile_number.slice(-4)}`) : null;
    return {
      ...row,
      approved_amount:num(row.approved_amount),
      site:siteMap.get(row.site_id)||null,
      category:categoryMap.get(row.category_id)||null,
      payee:payee?{...payee,payout:profile?{...profile,provider,masked_destination:masked}:null}:null,
      payment_ready:ready,
      payment_run:expenseRunByRequest.get(row.id)||null,
      payment_blockers:ready?[]:[row.payee_id?'Assigned payee does not have a verified active payout profile.':'Accountant must assign a verified expense payee before payment.'],
    };
  });

  const paymentRuns=runs.map((run)=>{
    const items=itemsByRun.get(run.id)||[];
    const counts=items.reduce((a,i)=>{a[i.status]=(a[i.status]||0)+1;return a;},{});
    const batch=run.payroll_batch_id?batchMap.get(run.payroll_batch_id)||null:null;
    return {
      ...run,
      total_amount:num(run.total_amount),
      batch:batch?{...batch,net_total:num(batch.net_total),pay_period:periodMap.get(batch.pay_period_id)||null}:null,
      source_account:run.source_payment_account_id?accountMap.get(run.source_payment_account_id)||null:null,
      expense_request_id:items.find((i)=>i.expense_request_id)?.expense_request_id||null,
      progress:{queued:counts.queued||0,submitted:counts.submitted||0,paid:counts.paid||0,failed:counts.failed||0,skipped:counts.skipped||0},
    };
  });

  return {
    payroll,
    expenses,
    payment_runs: paymentRuns,
    summary:{
      payroll_batches:payroll.length,
      payroll_recipients:payroll.reduce((s,r)=>s+r.payable_recipients,0),
      payroll_total:Number(payroll.reduce((s,r)=>s+r.net_total,0).toFixed(2)),
      payroll_ready_batches:payroll.filter((r)=>r.payment_ready&&!r.payment_run).length,
      expense_requests:expenses.length,
      expense_total:Number(expenses.reduce((s,r)=>s+r.approved_amount,0).toFixed(2)),
      expense_ready_requests:expenses.filter((r)=>r.payment_ready&&!r.payment_run).length,
      active_payment_runs:paymentRuns.filter((r)=>['prepared','executing','partial_failed','failed'].includes(r.status)).length,
      completed_payment_runs:paymentRuns.filter((r)=>r.status==='completed').length,
    },
  };
}

export async function GET() {
  const access=await requireCEO('payments.view');
  if(!access.ok) return NextResponse.json({success:false,error:access.error},{status:access.status});
  try {
    const db=createSupabaseAdminClient();
    return NextResponse.json({success:true,data:await loadPaymentCenter(db)});
  } catch(error) {
    console.error('CEO payment center GET error:',error);
    return NextResponse.json({success:false,error:'Failed to load CEO payment center.'},{status:500});
  }
}

export async function POST(request) {
  try {
    const body=await request.json();
    const action=String(body.action||'').trim().toLowerCase();
    const db=createSupabaseAdminClient();

    if(action==='prepare_payroll'){
      const access=await requireCEO('payroll.execute');
      if(!access.ok) return NextResponse.json({success:false,error:access.error},{status:access.status});
      const batchId=String(body.batch_id||'').trim();
      if(!batchId) return NextResponse.json({success:false,error:'Payroll batch ID is required.'},{status:400});

      const { data: batch, error: batchError } = await db.from('payroll_batches').select('id,scheduled_payment_date').eq('id', batchId).maybeSingle();
      if (batchError) throw batchError;
      if (!batch?.scheduled_payment_date) return NextResponse.json({ success:false, error:'This payroll has no scheduled payment date. Return it to the Accountant before release.' }, { status:400 });

      const {data:run,error}=await db.rpc('ceo_prepare_payroll_payment_run',{p_ceo_id:access.user.id,p_batch_id:batchId});
      if(error) return NextResponse.json({success:false,error:error.message},{status:400});
      await writeAuditLog(db,{actorUserId:access.user.id,action:'RELEASE_PAYROLL_PAYMENT_RUN',module:'Payments',entityType:'payment_run',entityId:run.id,details:`CEO released payroll payment run ${run.run_code}.`,metadata:{payroll_batch_id:batchId,scheduled_payment_date:batch.scheduled_payment_date,total_items:run.total_items,total_amount:num(run.total_amount)}});
      return NextResponse.json({success:true,data:run,message:'Payroll released for payment. Finance can now submit the locked instructions to the approved payment channel.'},{status:201});
    }

    if(action==='prepare_expense'){
      const access=await requireCEO('expenses.final_approve');
      if(!access.ok) return NextResponse.json({success:false,error:access.error},{status:access.status});
      const requestId=String(body.request_id||'').trim();
      if(!requestId) return NextResponse.json({success:false,error:'Expense request ID is required.'},{status:400});
      const {data:run,error}=await db.rpc('ceo_prepare_expense_payment_run',{p_ceo_id:access.user.id,p_request_id:requestId});
      if(error) return NextResponse.json({success:false,error:error.message},{status:400});
      await writeAuditLog(db,{actorUserId:access.user.id,action:'RELEASE_EXPENSE_PAYMENT_RUN',module:'Payments',entityType:'payment_run',entityId:run.id,details:`CEO released expense payment run ${run.run_code}.`,metadata:{expense_request_id:requestId,total_amount:num(run.total_amount)}});
      return NextResponse.json({success:true,data:run,message:'Expense released for payment. Finance can now submit the locked instruction from the company payment account.'},{status:201});
    }

    return NextResponse.json({success:false,error:'Unsupported payment center action.'},{status:400});
  } catch(error){
    console.error('CEO payment center POST error:',error);
    return NextResponse.json({success:false,error:'Failed to release payment.'},{status:500});
  }
}
