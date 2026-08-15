import { useEffect } from 'react';

/**
 * Standalone house-rules sheet for the A.S.S.BUMP birthday tournament.
 *
 * Rendered outside the AppShell (like FullScreenTimerPage) because it is a
 * poster-style document, not part of the app chrome. All styling is scoped
 * under `.assbump` so the invite palette does not leak into the rest of the app.
 */

const styles = `
.assbump {
  --black: #000000;
  --surface: #0C0C0C;
  --hairline: #2A2A2A;
  --hairline-soft: #1C1C1C;
  --white: #FFFFFF;
  --muted: #999999;
  --red: #E01F26;

  --poster: Impact, Haettenschweiler, "Franklin Gothic Heavy", "Arial Narrow", "Arial Black", sans-serif;
  --sans: "Segoe UI", -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;

  min-height: 100vh;
  min-height: 100dvh;
  background: var(--black);
  color: var(--white);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

.assbump .sheet {
  max-width: 40rem;
  margin: 0 auto;
  padding: 2.25rem 1.25rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

/* ---------- masthead ---------- */

.assbump .masthead {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  text-align: center;
  padding-bottom: 2.25rem;
  border-bottom: 3px solid var(--red);
}

.assbump .masthead .over {
  font-family: var(--poster);
  font-size: clamp(0.95rem, 4vw, 1.2rem);
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--white);
}

.assbump .masthead h1 {
  font-family: var(--poster);
  font-weight: normal;
  font-size: clamp(3rem, 15vw, 5rem);
  line-height: 0.88;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--white);
  text-wrap: balance;
}

.assbump .masthead h1 em { font-style: normal; color: var(--red); }

.assbump .suits {
  font-size: 1rem;
  letter-spacing: 0.5em;
  text-indent: 0.5em;
  color: var(--red);
}

.assbump .suits b { color: var(--white); font-weight: normal; }

.assbump .roster {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 1.35rem;
  font-family: var(--poster);
  font-size: 1.25rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.assbump .roster span { white-space: nowrap; }
.assbump .roster .mark { color: var(--red); margin-right: 0.3em; font-weight: normal; }

.assbump .datum {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

/* ---------- section scaffolding ---------- */

.assbump section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.assbump .eyebrow {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  font-family: var(--poster);
  font-size: 1.35rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--red);
}

.assbump .eyebrow::after {
  content: "";
  flex: 1;
  height: 2px;
  background: var(--hairline);
}

.assbump .lede {
  font-size: 0.97rem;
  line-height: 1.5;
  color: var(--muted);
  margin-top: -0.5rem;
}

.assbump .lede b { color: var(--white); font-weight: 700; }

/* ---------- buy-in table ---------- */

.assbump .money-wrap { overflow-x: auto; }

.assbump table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  min-width: 28rem;
}

.assbump thead th {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  text-align: right;
  padding: 0 0 0.6rem;
  border-bottom: 2px solid var(--hairline);
}

.assbump thead th:first-child { text-align: left; }

.assbump tbody td {
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--hairline-soft);
  text-align: right;
  font-size: 1rem;
  font-weight: 600;
  vertical-align: top;
}

.assbump tbody td:first-child {
  text-align: left;
  font-family: var(--poster);
  font-weight: normal;
  font-size: 1.2rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding-right: 1rem;
}

.assbump tbody tr:last-child td { border-bottom: none; }

.assbump tbody td .chips {
  display: block;
  font-family: var(--sans);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 0.15rem;
}

.assbump td .nil { color: #5A5A5A; font-weight: 400; }
.assbump .amount-lead { color: var(--red); }

.assbump .money-note {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.5;
}

.assbump .money-note b { color: var(--white); font-weight: 700; }

/* ---------- the two shots ---------- */

.assbump .shots {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 2px solid var(--red);
}

.assbump .shot {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1.4rem 1.35rem;
}

.assbump .shot + .shot { border-top: 1px solid var(--hairline); }

.assbump .shot .when {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--red);
}

.assbump .shot h3 {
  font-family: var(--poster);
  font-weight: normal;
  font-size: 2rem;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--white);
}

.assbump .shot p { font-size: 0.97rem; }

/* ---------- rule list ---------- */

.assbump .rules { display: flex; flex-direction: column; }

.assbump .rule {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1.2rem 0;
  border-bottom: 1px solid var(--hairline-soft);
}

.assbump .rule:first-child { padding-top: 0; }
.assbump .rule:last-child { border-bottom: none; padding-bottom: 0; }

.assbump .rule-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem 0.7rem;
}

.assbump .rule-head h3 {
  font-family: var(--poster);
  font-weight: normal;
  font-size: 1.6rem;
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--white);
}

.assbump .rule p { font-size: 0.97rem; }
.assbump .rule p .fine { color: var(--muted); }
.assbump .rule p b { color: var(--white); font-weight: 700; }

.assbump .tag {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.32em 0.62em;
  line-height: 1;
  white-space: nowrap;
}

.assbump .tag-shot { background: var(--red); color: var(--white); }
.assbump .tag-drink { border: 1px solid var(--white); color: var(--white); }
.assbump .tag-money { border: 1px solid var(--red); color: var(--red); }

/* ---------- endgame ladder ---------- */

.assbump .ladder {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--hairline);
}

.assbump .rung {
  display: flex;
  gap: 1.1rem;
  padding: 1.1rem 1.25rem;
  background: var(--surface);
}

.assbump .rung + .rung { border-top: 1px solid var(--hairline); }

.assbump .rung .cue {
  font-family: var(--poster);
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--red);
  flex: none;
  width: 6.5rem;
  line-height: 1.3;
}

.assbump .rung p { font-size: 0.95rem; line-height: 1.5; }

.assbump .backup {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.1rem 1.25rem;
  border: 1px dashed var(--hairline);
}

.assbump .backup .cue {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--poster);
  font-size: 1.25rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--white);
}

.assbump .backup p { font-size: 0.95rem; color: var(--muted); }
.assbump .backup p b { color: var(--white); font-weight: 600; }

/* ---------- ass pot ---------- */

.assbump .field {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--hairline);
}

.assbump .field-row {
  display: flex;
  gap: 1.1rem;
  padding: 1.1rem 1.25rem;
  background: var(--surface);
}

.assbump .field-row + .field-row { border-top: 1px solid var(--hairline); }

.assbump .field-row .who {
  font-family: var(--poster);
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--white);
  flex: none;
  width: 6.5rem;
  line-height: 1.25;
}

.assbump .field-row p { font-size: 0.95rem; line-height: 1.5; color: var(--muted); }

.assbump .payouts { display: flex; flex-direction: column; }

.assbump .payout {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--hairline-soft);
}

.assbump .payout:last-child { border-bottom: none; }

.assbump .payout .pct {
  font-family: var(--poster);
  font-size: 2.4rem;
  line-height: 0.9;
  color: var(--red);
  font-variant-numeric: tabular-nums;
  flex: none;
  width: 4.6rem;
}

.assbump .payout div { display: flex; flex-direction: column; gap: 0.15rem; }

.assbump .payout strong {
  font-family: var(--poster);
  font-weight: normal;
  font-size: 1.25rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.assbump .payout span { font-size: 0.92rem; color: var(--muted); line-height: 1.45; }

/* ---------- fine print ---------- */

.assbump .fineprint {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.assbump .fineprint li {
  display: flex;
  gap: 0.8rem;
  font-size: 0.93rem;
  line-height: 1.5;
  color: var(--muted);
}

.assbump .fineprint li::before {
  content: "\\25C6";
  color: var(--red);
  flex: none;
}

.assbump .fineprint strong { color: var(--white); font-weight: 700; }

.assbump .colophon {
  text-align: center;
  font-family: var(--poster);
  font-size: 1.5rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.15;
  color: var(--white);
  padding-top: 2.25rem;
  border-top: 3px solid var(--red);
}

.assbump .colophon em { font-style: normal; color: var(--red); }

/* ---------- print ---------- */

@media print {
  .assbump {
    --black: #FFFFFF;
    --surface: #FFFFFF;
    --hairline: #B0B0B0;
    --hairline-soft: #D8D8D8;
    --white: #000000;
    --muted: #555555;
    --red: #C0141B;
    min-height: 0;
  }
  .assbump .sheet { padding: 0; gap: 2rem; max-width: none; }
  .assbump section,
  .assbump .rule,
  .assbump .shot,
  .assbump .rung,
  .assbump .payout { break-inside: avoid; }
  .assbump table { min-width: 0; }
  .assbump .tag-shot { background: none; color: var(--red); border: 1px solid var(--red); }
  .assbump td .nil { color: #8A8A8A; }
}
`;

export function RulesPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'A.S.S.BUMP House Rules';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="assbump">
      <style>{styles}</style>

      <div className="sheet">
        <header className="masthead">
          <p className="over">
            Celebrating A.S.S.BUMP
            <br />
            our August born poker aficionados
          </p>
          <h1>
            Poker Ass <em>Bump</em>
          </h1>
          <div className="suits">&#9830; <b>&#9824;</b> &#9829; <b>&#9827;</b> &#9830; <b>&#9824;</b> &#9829;</div>
          <div className="roster">
            <span>
              <b className="mark">&#9824;</b>Amrit
            </span>
            <span>
              <b className="mark">&#9829;</b>Sanjay
            </span>
            <span>
              <b className="mark">&#9830;</b>Sunil
            </span>
            <span>
              <b className="mark">&#9827;</b>Bump
            </span>
          </div>
          <div className="datum">House rules &nbsp;&middot;&nbsp; In effect all night</div>
        </header>

        <section>
          <div className="eyebrow">Buy-in</div>
          <div className="money-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Entry</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Prize pool</th>
                  <th scope="col">Bounty</th>
                  <th scope="col">ASS pot</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    First buy-in<span className="chips">1,500 chips</span>
                  </td>
                  <td className="amount-lead">$100</td>
                  <td>$60</td>
                  <td>$20</td>
                  <td>$20</td>
                </tr>
                <tr>
                  <td>
                    Second buy-in<span className="chips">1,500 chips</span>
                  </td>
                  <td className="amount-lead">$100</td>
                  <td>$100</td>
                  <td className="nil">$0</td>
                  <td className="nil">$0</td>
                </tr>
                <tr>
                  <td>
                    Third and beyond<span className="chips">1,500 chips</span>
                  </td>
                  <td className="amount-lead">$60</td>
                  <td>$60</td>
                  <td className="nil">$0</td>
                  <td className="nil">$0</td>
                </tr>
                <tr>
                  <td>
                    Add-on<span className="chips">1,000 chips</span>
                  </td>
                  <td className="amount-lead">$30</td>
                  <td>$30</td>
                  <td className="nil">$0</td>
                  <td className="nil">$0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="money-note">
            Bounty and ASS pot are charged on your <b>first buy-in only</b>. Every bullet after that is pure prize
            pool, same starting stack, and your bounty stays $20 all night no matter how many times you fire. The
            add-on is one per player, offered when rebuys close, open to everyone whether you rebought or not. Take it
            at the same moment as the <b>Immunity&rsquo;s Dead</b> shot so it all happens in one break.
          </p>
        </section>

        <section>
          <div className="eyebrow">The two shots</div>
          <p className="lede">Table-wide. Nobody sits these out.</p>
          <div className="shots">
            <div className="shot">
              <div className="when">Before the first hand</div>
              <h3>The Candle</h3>
              <p>Everyone stands. Four names get said. Everyone shoots.</p>
            </div>
            <div className="shot">
              <div className="when">The moment rebuys close</div>
              <h3>Immunity&rsquo;s Dead</h3>
              <p>
                Whole table shoots. Birthday Immunity ends on this shot. From here the birthday boys are fair game and
                the ASS pot is live.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="eyebrow">Birthday rules</div>
          <div className="rules">
            <div className="rule">
              <div className="rule-head">
                <h3>Birthday Immunity</h3>
                <span className="tag tag-shot">Shot</span>
              </div>
              <p>
                Knock out a birthday boy during the rebuy period and you take a shot, immediately, at the table.{' '}
                <span className="fine">One shot per knockout. No doubles for anyone.</span>
              </p>
            </div>

            <div className="rule">
              <div className="rule-head">
                <h3>Birthday Bluff</h3>
                <span className="tag tag-drink">Drink</span>
              </div>
              <p>
                Each birthday boy gets one for the whole tournament. After taking a pot without a showdown, he may show
                one card and name anyone at the table to drink.{' '}
                <span className="fine">Expires at the final table. Use it or lose it.</span>
              </p>
            </div>

            <div className="rule">
              <div className="rule-head">
                <h3>Birthday Suits</h3>
                <span className="tag tag-drink">Drink</span>
              </div>
              <p>
                Amrit &#9824; &nbsp; Sanjay &#9829; &nbsp; Sunil &#9830; &nbsp; Bump &#9827;. Win a pot with a flush in
                his suit and he pours, then you both drink.
              </p>
            </div>

            <div className="rule">
              <div className="rule-head">
                <h3>Bad Beat Medicine</h3>
                <span className="tag tag-drink">Drink</span>
              </div>
              <p>A birthday boy loses a pot holding aces, kings or queens. The winner pours and you both drink.</p>
            </div>

            <div className="rule">
              <div className="rule-head">
                <h3>Cheers, Bitch</h3>
                <span className="tag tag-drink">Drink</span>
              </div>
              <p>
                A birthday boy busts for real. The table stands, toasts him, and everyone drinks, him included.{' '}
                <span className="fine">
                  The order they bust in is the official Last Ass Standing order. No arguments later.
                </span>
              </p>
            </div>

            <div className="rule">
              <div className="rule-head">
                <h3>Show Your Ass</h3>
                <span className="tag tag-money">$5 each</span>
                <span className="tag tag-drink">Drink</span>
              </div>
              <p>
                Win a pot holding seven-deuce offsuit and show it. Every player owes $5 to the ASS pot and the whole
                table drinks.{' '}
                <span className="fine">
                  Showdown or uncontested, both count. Bluff them off it if you can. You just have to show.
                </span>
              </p>
              <p>
                <b>If you are not a birthday boy, this also buys you into the ASS pot race.</b> See below.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="eyebrow">Table rules</div>
          <div className="rules">
            <div className="rule">
              <div className="rule-head">
                <h3>Rebuy Toast</h3>
                <span className="tag tag-drink">Drink</span>
              </div>
              <p>
                Every time you buy back in, you drink. Once you are into $60 territory, third bullet and beyond, make it
                a shot.
              </p>
            </div>

            <div className="rule">
              <div className="rule-head">
                <h3>Crown Tax</h3>
                <span className="tag tag-drink">Drink</span>
              </div>
              <p>Blinds go up, the chip leader drinks. Every level, all night.</p>
            </div>

            <div className="rule">
              <div className="rule-head">
                <h3>Bubble Boy</h3>
                <span className="tag tag-shot">Shot</span>
              </div>
              <p>Bust one spot out of the money and take a shot. The table cheers you on the way out.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="eyebrow">How it ends</div>
          <p className="lede">
            The tournament stops at <b>two players</b>. Those two decide: chop by chip count, or play it out.
          </p>
          <div className="ladder">
            <div className="rung">
              <div className="cue">They agree</div>
              <p>Whatever the two of them settle on goes. Chop by chip count or play heads-up, their call.</p>
            </div>
            <div className="rung">
              <div className="cue">No deal, before 1:00 AM</div>
              <p>
                Play fifteen minutes of heads-up. When the clock hits zero, chop by chip count wherever it stands.
              </p>
            </div>
            <div className="rung">
              <div className="cue">No deal, after 1:00 AM</div>
              <p>Chip count immediately. No hands, no discussion, go home.</p>
            </div>
          </div>
          <div className="backup">
            <div className="cue">
              <span className="tag tag-shot">Shot</span> Heads-Up Toast
            </div>
            <p>
              <b>Backup rule.</b> Only if the last two actually play it out. Both shoot before the first heads-up hand
              is dealt. If they chop, this never happens.
            </p>
          </div>
        </section>

        <section>
          <div className="eyebrow">The ASS pot</div>
          <p className="lede">
            $20 from every player&rsquo;s first buy-in, plus every $5 collected on Show Your Ass. Won by the last one
            standing out of everyone in the race.
          </p>

          <div className="field">
            <div className="field-row">
              <div className="who">In by birth</div>
              <p>Amrit, Sanjay, Sunil and Bump. Automatic, no action required.</p>
            </div>
            <div className="field-row">
              <div className="who">In by ass</div>
              <p>
                Any non-birthday player who wins a pot with seven-deuce offsuit and shows it. Multiple players can
                qualify. Once you are in, you are in for the night.
              </p>
            </div>
          </div>

          <div className="payouts">
            <div className="payout">
              <div className="pct">100%</div>
              <div>
                <strong>Birthday boy outlasts the field</strong>
                <span>If one of the four is the last man standing in the race, he takes the whole pot.</span>
              </div>
            </div>
            <div className="payout">
              <div className="pct">50/50</div>
              <div>
                <strong>A qualifier outlasts all four</strong>
                <span>
                  He takes half. The other half goes to whichever birthday boy lasted longest. An ass can win it, but he
                  cannot take it all.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="eyebrow">Rulings</div>
          <ul className="fineprint">
            <li>
              <span>
                <strong>One bounty per player.</strong> You carry a single $20 bounty no matter how many times you
                rebuy. You paid for it once.
              </span>
            </li>
            <li>
              <span>
                <strong>No bounties during the rebuy period.</strong> Nobody is eliminated until rebuys close, so no
                chips change hands before then.
              </span>
            </li>
            <li>
              <span>
                <strong>Drink means your drink.</strong> Non-alcoholic counts. Same glass, same toast, same timing.
                Everyone participates in every rule.
              </span>
            </li>
            <li>
              <span>
                <strong>The clock calls the rules.</strong> Whoever is running the blinds calls every ruling. No table
                debates.
              </span>
            </li>
            <li>
              <span>
                <strong>Shot Boy.</strong> The first player eliminated after rebuys close pours for the rest of the
                night.
              </span>
            </li>
            <li>
              <span>
                <strong>The tray stays on the table.</strong> Pre-poured, topped up between levels. A rule that needs a
                trip to the kitchen is a rule that gets skipped.
              </span>
            </li>
          </ul>
        </section>

        <p className="colophon">
          Happy birthday, gentlemen.
          <br />
          <em>Now sit down and pay attention.</em>
        </p>
      </div>
    </div>
  );
}
