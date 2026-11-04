import { JSXElement } from "solid-js";

import { Button } from "../common/Button";
import { H2, H3 } from "../common/Headers";
import { Kbd } from "../common/Kbd";
import { CommandlineHotkey } from "../hotkeys/CommandlineHotkey";
import { QuickRestartHotkey } from "../hotkeys/QuickRestartHotkey";

export function AboutPage(): JSXElement {
  return (
    <div class="content-grid grid gap-8">
      <section class="text-center text-sub">
        Made by Khizar Ahmed.
        <br />
        Based on Monkeytype, created by Miodec.
      </section>
      <section>
        <H2 fa={{ icon: "fa-info-circle" }} text="about" />
        <p>
          This is a typing game for groups, built on Monkeytype. Someone creates
          a game, everyone joins with its code, and a live leaderboard shows who
          is fastest. There are no accounts, no passwords and no ads, and anyone
          can host their own copy.
        </p>
      </section>
      <section>
        <H3 fa={{ icon: "fa-gamepad" }} text="how to play" />
        <p>
          Join with a 5 character code, or create a game and share its code. The
          host picks the test: time, words, quote, zen or custom text, plus
          punctuation, numbers and language. Those settings are locked for
          everyone, unless the host lets players choose their own.
          <br />
          <br />
          Type your name and play. Your name stays on your results, and everyone
          using the same name shares a place on the leaderboard.
        </p>
      </section>
      <section>
        <H3 fa={{ icon: "fa-crown" }} text="leaderboard" />
        <p>
          The crown button opens the leaderboard for your game. It lists
          everyone who has joined, ranked by their best wpm, and updates as
          tests finish. A notification also pops up on the typing page when
          someone finishes a test.
        </p>
      </section>
      <section>
        <H3 fa={{ icon: "fa-users" }} text="sharing a device" />
        <p>
          After a finished test, the next start asks who is playing, so you can
          pass the keyboard along. Press <Kbd text="ctrl + enter" /> to go again
          as the same player. Restarting in the middle of a test keeps your name
          too.
        </p>
      </section>
      <section>
        <H3 fa={{ icon: "fa-shield-alt" }} text="fair play" />
        <p>
          Results are checked on the server before they reach the leaderboard. A
          result is rejected if it is too short, below 75% accuracy, doesn't
          match the game's settings, or has speed and key timing that don't add
          up. Abandoned tests and repeated tests don't count.
        </p>
      </section>
      <section>
        <H3 fa={{ icon: "fa-keyboard" }} text="keybinds" />
        <p>
          You can use <QuickRestartHotkey /> to restart the typing test. Open
          the command line by pressing <CommandlineHotkey /> - there you can
          change your theme and other preferences without touching your mouse.
        </p>
      </section>
      <section>
        <H3 fa={{ icon: "fa-list-ol" }} text="stats" />
        <dl class="grid">
          <dt class="col-1 mr-4">wpm</dt>
          <dd class="col-2">
            - total number of characters in the correctly typed words (including
            spaces), divided by 5 and normalised to 60 seconds.
          </dd>

          <dt class="col-1 mr-4">raw wpm</dt>
          <dd class="col-2">
            {" "}
            - calculated just like wpm, but also includes incorrect words.
          </dd>

          <dt class="col-1 mr-4">acc</dt>
          <dd class="col-2"> - percentage of correctly pressed keys.</dd>

          <dt class="col-1 mr-4">char</dt>
          <dd class="col-2">
            - correct characters / incorrect characters. Calculated after the
            test has ended.
          </dd>

          <dt class="col-1 mr-4">consistency</dt>
          <dd class="col-2">
            - based on the variance of your raw wpm. Closer to 100% is better.
            Calculated using the coefficient of variation of raw wpm and mapped
            onto a scale from 0 to 100.
          </dd>
        </dl>
      </section>
      <section>
        <H3 fa={{ icon: "fa-chart-area" }} text="results screen" />
        <p>
          After completing a test you will be able to see your wpm, raw wpm,
          accuracy, character stats, test length and test info (you can hover
          over some values to get floating point numbers). You can also see a
          graph of your wpm and raw over the duration of the test. Remember that
          the wpm line is a global average, while the raw wpm line is a local,
          momentary value (meaning if you stop, the value is 0).
        </p>
      </section>
      <section>
        <H2 fa={{ icon: "fa-users" }} text="credits" />
        <p>
          <Button
            variant="text"
            text="Khizar Ahmed"
            href="https://khiz3r.me/"
            class="p-0 pt-2 pr-2 pb-2"
          />
          for this version
        </p>
        <p>
          <Button
            variant="text"
            text="Miodec"
            href="https://github.com/monkeytypegame/monkeytype"
            class="p-0 pt-2 pr-2 pb-2"
          />
          for creating Monkeytype, which this site is based on
        </p>
        <p>
          <Button
            variant="text"
            text="Montydrei"
            href="https://www.reddit.com/user/montydrei"
            class="p-0 pt-2 pr-2 pb-2"
          />
          for the name suggestion
        </p>
        <p>
          <Button
            variant="text"
            text="Everyone"
            href="https://www.reddit.com/r/MechanicalKeyboards/comments/gc6wx3/experimenting_with_a_completely_new_type_of/"
            class="p-0 pt-2 pr-2 pb-2"
          />
          who provided valuable feedback on the original reddit post for the
          prototype of Monkeytype
        </p>
        <p>
          <Button
            variant="text"
            text="Contributors"
            href="https://github.com/monkeytypegame/monkeytype/graphs/contributors"
            class="p-0 pt-2 pr-2 pb-2"
          />
          on GitHub that have helped Monkeytype with implementing various
          features, adding themes and more
        </p>
      </section>
    </div>
  );
}
