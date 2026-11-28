import { useEffect, useState } from "react";
import { Download, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fractions, polishDay, relativeDay, upcomingCollections, type Fraction, type wasteScheduleWeeks } from "../lib/waste";
import type { Locality } from "../lib/locality";

export const formatWasteDate = (date: string) => new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" }).format(new Date(date + "T12:00:00Z"));
const shortDate = (date: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" }).format(new Date(date + "T12:00:00Z"));

export function useWasteDay() {
  const [today, setToday] = useState(polishDay);
  useEffect(() => {
    const update = () => setToday(polishDay());
    const timer = window.setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  return today;
}

type WasteWeek = ReturnType<typeof wasteScheduleWeeks>[number];

function Schedule({ week, today }: { week: WasteWeek; today: string }) {
  const { schedule, active, collections: reminders } = week;
  const upcoming = upcomingCollections(schedule, today);
  return <article className="waste-subsection">
    <div className="section-heading waste-area">
      <h3>Rejon {schedule.region} · {schedule.coverage}</h3>
      <a className="source-link" href={schedule.sourceUrl} target="_blank" rel="noreferrer">Harmonogram gminy (PDF)<ExternalLink size={12} aria-hidden="true" /></a>
    </div>
    {(active || reminders.length > 0) && <>
      <p className="section-context"><strong>Wywozy w ciągu najbliższych 7 dni</strong></p>
      {reminders.map(entry => <div className="waste-next" key={entry.date}><div>
        <span className="pill good">{relativeDay(entry.date, today)}</span>
        <h4><time dateTime={entry.date}>{formatWasteDate(entry.date)}</time></h4>
        <p>{entry.fractions.map(fraction => fractions[fraction]).join(" · ")}</p>
      </div></div>)}
      {!reminders.length && <p className="section-message">Brak wywozów w ciągu najbliższych 7 dni.</p>}
    </>}
    {active && <ul className="waste-fractions">{(Object.keys(fractions) as Fraction[]).map(fraction => {
      const entry = upcoming.find(item => item.fractions.includes(fraction));
      return <li key={fraction}><span className={`waste-dot waste-${fraction}`} aria-hidden="true" /><div>
        <strong>{fractions[fraction]}</strong>
        {entry ? <><time dateTime={entry.date}>{formatWasteDate(entry.date)}</time><span>{relativeDay(entry.date, today)}</span></>
          : <span>Brak kolejnego terminu w tym harmonogramie</span>}
      </div></li>;
    })}</ul>}
    <div className="card-foot"><span>{shortDate(schedule.validFrom)} – {shortDate(schedule.validUntil)} · Zweryfikowano {shortDate(schedule.verifiedAt)}</span></div>
  </article>;
}

export default function WasteSection({ waste, today, weeks }: { waste: Locality["waste"]; today: string; weeks: WasteWeek[] }) {
  const visible = weeks.length ? weeks : waste.schedules.map(schedule => ({ schedule, active: false, collections: [] }));
  const calendars = waste.schedules.filter(schedule => schedule.calendarFile && today <= schedule.validUntil);
  return <section id="waste-details" className="card waste-section" aria-labelledby="waste-title">
    <div className="section-heading"><h2 id="waste-title"><Trash2 size={20} aria-hidden="true" />Wywóz odpadów</h2>
      <a className="source-link" href={waste.sourceUrl} target="_blank" rel="noreferrer">Wykaz gminy<ExternalLink size={12} aria-hidden="true" /></a>
    </div>
    <p className="section-context">Zabudowa jednorodzinna</p>
    {!weeks.length && <p className="error-note" role="status">Brak aktualnego harmonogramu w dashboardzie. Sprawdź wykaz gminy.</p>}
    {weeks.length > 0 && <p className="waste-reminder">Wystaw pojemniki lub worki do <strong>6:00 rano</strong> w dniu odbioru.</p>}
    {calendars.length > 0 && <div className="waste-calendars">
      <ul className="waste-downloads">
        {calendars.map((schedule, index) => {
          const labelId = `waste-calendar-${index + 1}`;
          return <li className="waste-download" key={schedule.calendarFile}>
            <div id={labelId}>
              <strong>Rejon {schedule.region} · {schedule.coverage}</strong>
              <p>{shortDate(schedule.validFrom)} – {shortDate(schedule.validUntil)} · Wersja z {shortDate(schedule.verifiedAt)}</p>
            </div>
            <Button asChild variant="outline">
              <a href={`${import.meta.env.BASE_URL}${schedule.calendarFile}`} aria-describedby={labelId} download>
                <Download size={16} aria-hidden="true" />Pobierz harmonogram (.ics)
              </a>
            </Button>
          </li>;
        })}
      </ul>
      <details className="waste-import-help">
        <summary>Jak zaimportować harmonogram?</summary>
        <p>Import zapisuje kopię terminów. Użyj osobnego kalendarza „Odpady”, żeby po zmianie harmonogramu łatwo zastąpić wcześniejsze wpisy.</p>
        <dl>
          <dt>Google Calendar</dt>
          <dd>Na komputerze otwórz ustawienia Kalendarza Google i wybierz import z pliku. Wskaż pobrany plik i kalendarz docelowy. <a className="source-link" href="https://support.google.com/calendar/answer/37118?hl=pl" target="_blank" rel="noreferrer">Instrukcja Google</a></dd>
          <dt>Outlook</dt>
          <dd>W przeglądarce wybierz w Outlooku „Dodaj kalendarz” i wskaż pobrany plik oraz kalendarz docelowy. <a className="source-link" href="https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web" target="_blank" rel="noreferrer">Instrukcja Microsoftu</a></dd>
          <dt>iCloud</dt>
          <dd>Na Macu wybierz w aplikacji Kalendarz „Plik” → „Importuj” i wskaż swój kalendarz iCloud. Na iPhonie lub iPadzie otwórz plik jako załącznik w aplikacji Poczta. <a className="source-link" href="https://support.apple.com/en-ca/guide/calendar/icl1023/mac" target="_blank" rel="noreferrer">Instrukcja na Maca</a> · <a className="source-link" href="https://support.apple.com/pl-pl/guide/iphone/ipha0d932e96/27/ios/27" target="_blank" rel="noreferrer">Instrukcja na iPhone’a</a></dd>
        </dl>
      </details>
    </div>}
    {visible.map(week => <Schedule
      key={`${week.schedule.region}:${week.schedule.coverage}:${week.schedule.validFrom}`} week={week} today={today}
    />)}
  </section>;
}
