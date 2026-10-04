import { useEffect, useRef, useState } from 'react'
import type { Reservation } from '../types/reservation'
import { decideReservation } from '../lib/admin'
import { statusLabels, dayLabel, waiting } from '../lib/reservationDisplay'

function Modal({title,children,onClose,busy}:{title:string;children:React.ReactNode;onClose:()=>void;busy:boolean}) {
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close()},[])
 return <dialog ref={ref} className="reservation-dialog" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><div className="panel-heading"><h2>{title}</h2><button className="button-secondary" disabled={busy} onClick={onClose} aria-label="Chiudi">×</button></div>{children}</dialog>
}
export default function ReservationList({rows,priority=false,onChanged}:{rows:Reservation[];priority?:boolean;onChanged:()=>void}) {
 const [detail,setDetail]=useState<Reservation|null>(null),[reject,setReject]=useState<Reservation|null>(null),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const lock=useRef(false)
 async function decide(row:Reservation,status:'confirmed'|'rejected') {
  if(lock.current)return
  lock.current=true;setBusy(row.id);setError('');setNotice('')
  try {await decideReservation(row.id,status);setDetail(null);setReject(null);setNotice(status==='confirmed'?'Prenotazione confermata.':'Richiesta rifiutata.');onChanged()}
  catch(cause){setError(cause instanceof Error?cause.message:'Operazione non riuscita. Riprova.');onChanged()}
  finally{lock.current=false;setBusy(null)}
 }
 const actions=(r:Reservation)=><div className="request-actions">{r.status==='pending'&&<><button className="button-primary" disabled={busy!==null} onClick={()=>void decide(r,'confirmed')}>{busy===r.id?'Salvataggio…':'Conferma'}</button><button className="button-secondary reject-button" disabled={busy!==null} onClick={()=>setReject(r)}>Rifiuta</button></>}<button className="button-secondary" disabled={busy!==null} onClick={()=>setDetail(r)}>Dettagli</button></div>
 return <>{error&&<p role="alert" className="submission-error">{error}</p>}{notice&&<p role="status" className="submission-status">{notice} Nessun messaggio automatico inviato.</p>}<div className="request-list">{rows.map((r,i)=><article className={`request-row ${priority&&i===0?'request-priority':''}`} key={r.id}><div className="request-time"><strong>{r.reservation_time.slice(0,5)}</strong><span>{dayLabel(r.reservation_date)}</span>{r.status==='pending'&&<small>da {waiting(r.created_at)}</small>}</div><div className="request-contact"><h3>{r.first_name} {r.last_name}</h3><a href={`tel:${r.phone.replace(/[^+0-9]/g,'')}`}>{r.phone}</a></div><span>{r.party_size} persone</span><p className="request-notes">{r.notes||'Nessuna nota'}</p>{r.status!=='pending'&&<span className={`status-badge status-${r.status}`}>{statusLabels[r.status]}</span>}{actions(r)}</article>)}</div>
 {detail&&<Modal title="Dettagli prenotazione" busy={busy!==null} onClose={()=>setDetail(null)}><dl>{Object.entries({Cliente:`${detail.first_name} ${detail.last_name}`,Telefono:detail.phone,Email:detail.email||'Non indicata',Data:dayLabel(detail.reservation_date),Ora:detail.reservation_time.slice(0,5),Persone:detail.party_size,Note:detail.notes||'Nessuna nota',Ricevuta:new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(detail.created_at)),Stato:statusLabels[detail.status],Fonte:detail.source==='website'?'Booking online':detail.source==='phone'?'Telefono':detail.source,Riferimento:detail.id}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><a className="contact-link" href={`tel:${detail.phone.replace(/[^+0-9]/g,'')}`}>Chiama il cliente</a>{actions(detail)}</Modal>}
 {reject&&<Modal title="Rifiutare questa richiesta?" busy={busy!==null} onClose={()=>setReject(null)}><p>{reject.first_name} {reject.last_name} · {dayLabel(reject.reservation_date)} · {reject.reservation_time.slice(0,5)}</p><p>La richiesta sarà registrata come rifiutata. Nessun messaggio automatico al cliente.</p>{error&&<p role="alert">{error}</p>}<div className="request-actions"><button className="button-secondary" disabled={busy!==null} onClick={()=>setReject(null)}>Annulla</button><button className="button-primary" disabled={busy!==null} onClick={()=>void decide(reject,'rejected')}>{busy?'Salvataggio…':'Conferma rifiuto'}</button></div></Modal>}</>
}
