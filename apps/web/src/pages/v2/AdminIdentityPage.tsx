import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useAuth } from '../../app/authContext';
import { Button, Card, Input, Notice, Select, TextArea, Title } from '../../app/ui';

export function AdminIdentity(){
  const {state}=useAuth();
  const [phone,setPhone]=useState(''); const [purpose,setPurpose]=useState<'LINK'|'RECOVERY'>('LINK');
  const [customerId,setCustomerId]=useState(''); const [summary,setSummary]=useState('');
  const [token,setToken]=useState(''); const [expiresAt,setExpiresAt]=useState('');
  const [error,setError]=useState<unknown>(); const [busy,setBusy]=useState(false);
  const matches=useQuery({queryKey:['admin','customers','identity',phone],queryFn:({signal})=>api.admin.customers(phone,1,signal),enabled:purpose==='LINK'&&/^0\d{9}$/.test(phone)});
  if(!state.canVerifyIdentity)return <><Title>Xác minh danh tính</Title><Card className="max-w-xl"><p>Tài khoản này chưa được cấp quyền phát hành bằng chứng xác minh. Liên hệ người phụ trách danh tính cửa hàng.</p></Card></>;
  const candidates=matches.data?.items.filter(item=>item.phone===phone&&!item.userId)||[];
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setError(undefined);setToken('');
    if(purpose==='LINK'&&!customerId){setError(new Error('Cần chọn đúng hồ sơ CRM để liên kết.'));return;}
    if(!window.confirm(`Đã kiểm tra trực tiếp danh tính cho số ${phone} và muốn phát hành mã ${purpose}?`))return;
    setBusy(true);
    try{const result=await api.admin.identityEvidence({phone,purpose,evidenceSummary:summary.trim(),...(purpose==='LINK'?{customerId}:{})});setToken(result.verificationToken);setExpiresAt(result.expiresAt);}
    catch(cause){setError(cause);}
    finally{setBusy(false);}
  };
  const hint=error instanceof ApiError&&error.status===429?'Có quá nhiều lần thử. Chờ hết giới hạn rồi xác minh lại.':error instanceof ApiError&&error.status===409?'Kiểm tra số điện thoại, hồ sơ CRM và trạng thái liên kết trước khi phát hành lại.':null;
  return <><Title>Xác minh danh tính tại quầy</Title><p className="mb-5 text-text-secondary">Kiểm tra danh tính trực tiếp theo quy trình cửa hàng. Mã một lần chỉ trao cho đúng khách và hết hạn sau 15 phút.</p><Card className="max-w-xl"><Notice error={error}/>{hint&&<p className="text-sm mb-3">{hint}</p>}{token&&<div role="status" className="mb-4 p-3 bg-emerald-50"><p>Mã dùng một lần: <b className="break-all">{token}</b></p><p>Hết hạn: {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(expiresAt))}</p><Button variant="secondary" onClick={()=>setToken('')}>Ẩn mã</Button></div>}<form onSubmit={submit} className="space-y-3"><Input label="Số điện thoại" required pattern="0[0-9]{9}" value={phone} onChange={event=>{setPhone(event.target.value);setCustomerId('');setToken('');}}/><Select label="Mục đích" value={purpose} onChange={event=>{setPurpose(event.target.value as typeof purpose);setCustomerId('');setToken('');}} options={[{value:'LINK',label:'Đăng ký / liên kết CRM'},{value:'RECOVERY',label:'Khôi phục mật khẩu'}]}/>{purpose==='LINK'&&<><Select label="Hồ sơ CRM chưa liên kết" required value={customerId} onChange={event=>setCustomerId(event.target.value)} options={[{value:'',label:matches.isLoading?'Đang tìm…':'Chọn hồ sơ'},...candidates.map(item=>({value:item.id,label:`${item.fullName} · ${item.phone} · #${item.id}`}))]}/>{matches.data&&candidates.length!==1&&<p className="text-sm text-red-800">Cần đúng một hồ sơ CRM chưa liên kết với số này. <Link className="underline" to="/admin/customers">Kiểm tra CRM</Link>.</p>}</>}<TextArea label="Phương thức và mã tham chiếu xác minh" required maxLength={500} value={summary} onChange={event=>setSummary(event.target.value)}/><Button type="submit" disabled={busy||purpose==='LINK'&&candidates.length!==1}>{busy?'Đang phát hành…':'Phát hành mã'}</Button></form></Card></>;
}
