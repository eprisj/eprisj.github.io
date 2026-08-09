import { useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, X } from 'lucide-react';
import { sendEnquiry, type Enquiry } from './showcaseApi';

/* Дверь для заказчика.
 *
 * Отдельная форма, а не «ещё одна вкладка» в подаче работ: там человек ОТДАЁТ
 * свою работу и должен назвать автора, лицензию, источник; здесь человек хочет
 * НАНЯТЬ, и от него нужны срок, место и порядок бюджета. Смешать их значило бы
 * спросить у заказчика имя фотографа, а у автора — сколько он готов заплатить.
 */

const KINDS = ['Scenography', 'Exhibition', 'Installation', 'Retail / window', 'Event', 'Something else'];
const BUDGETS = ['under 5k', '5–15k', '15–40k', '40k+', 'not decided yet'];

export function Commission({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<Enquiry>({ name: '', contact: '', brief: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'success'>('idle');
  const [message, setMessage] = useState('');

  const field = (key: keyof Enquiry) => ({
    value: (draft[key] as string) || '',
    onChange: (e: { target: { value: string } }) => setDraft((prev) => ({ ...prev, [key]: e.target.value })),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('sending');
    setMessage('');
    try {
      await sendEnquiry(draft);
      setState('success');
    } catch (error) {
      setState('idle');
      setMessage(error instanceof Error ? error.message : 'Could not send the enquiry');
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#1a0b10]/70 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-[#f5f0eb] sm:rounded-none">
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-[#4a1728]/12 bg-[#f5f0eb] px-5 py-4 sm:px-8">
          <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#4a1728]/50">Commission the bureau</p>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#4a1728]/60 hover:text-[#4a1728]">
            <X size={18} />
          </button>
        </div>

        {state === 'success' ? (
          <div className="px-5 py-14 text-center sm:px-8">
            <h2 className="font-sans text-[2rem] font-bold lowercase leading-[0.95] tracking-[-0.03em] text-[#4a1728]">
              it is with the editorial
            </h2>
            <p className="mx-auto mt-4 max-w-md font-sans text-[14px] leading-relaxed text-[#4a1728]/70">
              A person reads every enquiry — nothing here is automatic. If the brief fits what
              the bureau does, you will hear back at the address you left.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 inline-flex min-h-12 items-center gap-2 border border-[#4a1728]/30 px-6 font-sans text-[10px] uppercase tracking-[0.18em] text-[#4a1728] hover:border-[#4a1728]"
            >
              Back to the vitrine
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 py-6 sm:px-8 sm:py-8">
            <p className="max-w-[54ch] font-sans text-[14px] leading-relaxed text-[#4a1728]/75">
              Tell us what the space has to do. Rough is fine — a room, a date and a sentence
              about the work is enough to answer whether we are the right people.
            </p>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">Your name *</span>
                <input required {...field('name')} className="mt-1.5 w-full border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] text-[#1a0b10] focus:border-[#4a1728] focus:outline-none" />
              </label>
              <label className="block">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">Email or phone *</span>
                <input required {...field('contact')} className="mt-1.5 w-full border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] text-[#1a0b10] focus:border-[#4a1728] focus:outline-none" />
              </label>
              <label className="block">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">Theatre, brand or institution</span>
                <input {...field('organisation')} className="mt-1.5 w-full border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] text-[#1a0b10] focus:border-[#4a1728] focus:outline-none" />
              </label>
              <label className="block">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">What kind of work</span>
                <select {...field('kind')} className="mt-1.5 w-full border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] text-[#1a0b10] focus:border-[#4a1728] focus:outline-none">
                  <option value="">—</option>
                  {KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">Where</span>
                <input {...field('place')} placeholder="city, venue" className="mt-1.5 w-full border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] text-[#1a0b10] placeholder:text-[#4a1728]/30 focus:border-[#4a1728] focus:outline-none" />
              </label>
              <label className="block">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">When</span>
                <input {...field('when')} placeholder="month, season, year" className="mt-1.5 w-full border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] text-[#1a0b10] placeholder:text-[#4a1728]/30 focus:border-[#4a1728] focus:outline-none" />
              </label>
              <label className="block sm:col-span-2">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">Budget in mind</span>
                {/* Порядок, а не сумма: точную цифру на этом этапе не знает и
                    сам заказчик, а вилка отсеивает разговоры не по адресу. */}
                <select {...field('budget')} className="mt-1.5 w-full border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] text-[#1a0b10] focus:border-[#4a1728] focus:outline-none">
                  <option value="">—</option>
                  {BUDGETS.map((band) => <option key={band} value={band}>{band}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#4a1728]/50">The brief *</span>
                <textarea required rows={5} {...field('brief')} placeholder="What happens in the space, who watches it, and what it must not be." className="mt-1.5 w-full resize-y border-b border-[#4a1728]/25 bg-transparent py-2 font-sans text-[15px] leading-relaxed text-[#1a0b10] placeholder:text-[#4a1728]/30 focus:border-[#4a1728] focus:outline-none" />
              </label>
            </div>

            {/* Ловушка для ботов: скрыта от глаз и от скринридера, заполнить её
                может только автомат. */}
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" {...field('website')} className="absolute left-[-9999px] h-0 w-0 opacity-0" />

            {message && <p className="mt-5 font-sans text-[13px] text-[#8c2f24]">{message}</p>}

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#4a1728]/12 pt-6">
              <button
                type="submit"
                disabled={state === 'sending'}
                className="group inline-flex min-h-12 items-center gap-2.5 bg-[#4a1728] px-7 font-sans text-[10px] uppercase tracking-[0.18em] text-[#f5f0eb] disabled:opacity-60"
              >
                {state === 'sending' ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />}
                Send the brief
              </button>
              <p className="font-sans text-[10px] leading-relaxed text-[#4a1728]/45">
                Goes to the editorial only. Never published, never listed.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
