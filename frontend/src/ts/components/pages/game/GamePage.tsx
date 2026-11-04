import type { Language } from "@monkeytype/schemas/languages";
import type { Optgroup } from "slim-select/store";

import {
  type Game,
  GAME_CODE_LENGTH,
  type GameMode,
  GameModeSchema,
  type GameSettings,
  GameSettingsSchema,
  MAX_CUSTOM_TEXT_LENGTH,
  MAX_TIME_SECONDS,
  MAX_WORDS,
  MIN_TIME_SECONDS,
  MIN_WORDS,
  normalizeGameSettings,
} from "@monkeytype/schemas/games";
import {
  createSignal,
  For,
  JSXElement,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { createStore } from "solid-js/store";

import { Config } from "../../../config/store";
import {
  LanguageGroupNames,
  LanguageGroups,
} from "../../../constants/languages";
import {
  createGame,
  findGame,
  joinGame,
} from "../../../controllers/game-controller";
import { navigate } from "../../../router/navigate";
import { getGameLabel } from "../../../states/game";
import { showErrorNotification } from "../../../states/notifications";
import { getLanguageDisplayString } from "../../../utils/strings";
import { Button } from "../../common/Button";
import { H2 } from "../../common/Headers";
import SlimSelect from "../../ui/SlimSelect";

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];
const QUOTE_OPTIONS = [
  { value: 0, text: "short" },
  { value: 1, text: "medium" },
  { value: 2, text: "long" },
  { value: 3, text: "thicc" },
];

// built once - a new array on every read would make SlimSelect rebuild its options
const languageOptionGroups = LanguageGroupNames.map(
  (group) =>
    ({
      label: group,
      options: LanguageGroups[group]?.map((language) => ({
        text: getLanguageDisplayString(language),
        value: language,
      })),
    }) as Optgroup,
);

function focusOnMount(element: HTMLInputElement): void {
  onMount(() => element.focus());
}

function OptionRow(props: { title: string; children: JSXElement }): JSXElement {
  return (
    <div class="grid gap-2">
      <div class="text-sub">{props.title}</div>
      <div class="flex flex-wrap items-center gap-2">{props.children}</div>
    </div>
  );
}

function NumberOptions(props: {
  options: number[];
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}): JSXElement {
  return (
    <>
      <For each={props.options}>
        {(option) => (
          <Button
            variant="button"
            text={String(option)}
            active={props.value === option}
            onClick={() => props.onChange(option)}
          />
        )}
      </For>
      <input
        class="w-24"
        type="number"
        aria-label={props.label}
        placeholder="custom"
        min={props.min}
        max={props.max}
        value={props.options.includes(props.value) ? "" : props.value}
        onInput={(e) => {
          const value = e.currentTarget.valueAsNumber;
          if (!Number.isNaN(value)) props.onChange(value);
        }}
      />
    </>
  );
}

function CreateGame(props: { onCreated: (game: Game) => void }): JSXElement {
  const [settings, setSettings] = createStore<GameSettings>({
    locked: true,
    mode: "time",
    time: 30,
    words: 25,
    quoteLength: [1],
    punctuation: false,
    numbers: false,
    language: Config.language,
    customText: "",
  });
  const [isCreating, setCreating] = createSignal(false);

  const hasModifiers = (): boolean =>
    settings.mode === "time" || settings.mode === "words";

  const toggleQuoteLength = (length: number): void => {
    const lengths = settings.quoteLength.includes(length)
      ? settings.quoteLength.filter((it) => it !== length)
      : [...settings.quoteLength, length];
    if (lengths.length > 0) setSettings("quoteLength", lengths);
  };

  const submit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault();
    const parsed = GameSettingsSchema.safeParse({ ...settings });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      showErrorNotification(issue?.message ?? "Invalid settings");
      return;
    }
    setCreating(true);
    try {
      props.onCreated(await createGame(normalizeGameSettings(parsed.data)));
    } catch (error) {
      showErrorNotification("Could not create the game", { error });
    }
    setCreating(false);
  };

  return (
    <form
      class="grid min-w-0 content-start gap-4"
      onSubmit={(e) => void submit(e)}
    >
      <H2 text="create a game" fa={{ icon: "fa-plus" }} class="text-2xl" />

      <OptionRow title="lock settings">
        <Button
          variant="button"
          text="same for everyone"
          active={settings.locked}
          onClick={() => setSettings("locked", true)}
        />
        <Button
          variant="button"
          text="players choose"
          active={!settings.locked}
          onClick={() => setSettings("locked", false)}
        />
      </OptionRow>

      <Show when={settings.locked}>
        <OptionRow title="mode">
          <For each={GameModeSchema.options}>
            {(mode: GameMode) => (
              <Button
                variant="button"
                text={mode}
                active={settings.mode === mode}
                onClick={() => setSettings("mode", mode)}
              />
            )}
          </For>
        </OptionRow>

        <Switch>
          <Match when={settings.mode === "time"}>
            <OptionRow title="seconds">
              <NumberOptions
                options={TIME_OPTIONS}
                value={settings.time}
                min={MIN_TIME_SECONDS}
                max={MAX_TIME_SECONDS}
                label="custom seconds"
                onChange={(value) => setSettings("time", value)}
              />
            </OptionRow>
          </Match>
          <Match when={settings.mode === "words"}>
            <OptionRow title="words">
              <NumberOptions
                options={WORD_OPTIONS}
                value={settings.words}
                min={MIN_WORDS}
                max={MAX_WORDS}
                label="custom words"
                onChange={(value) => setSettings("words", value)}
              />
            </OptionRow>
          </Match>
          <Match when={settings.mode === "quote"}>
            <OptionRow title="quote length">
              <For each={QUOTE_OPTIONS}>
                {(option) => (
                  <Button
                    variant="button"
                    text={option.text}
                    active={settings.quoteLength.includes(option.value)}
                    onClick={() => toggleQuoteLength(option.value)}
                  />
                )}
              </For>
            </OptionRow>
          </Match>
          <Match when={settings.mode === "custom"}>
            <OptionRow title="text">
              <textarea
                class="min-h-32 w-full"
                aria-label="custom text"
                placeholder={`at least ${MIN_WORDS} words`}
                maxLength={MAX_CUSTOM_TEXT_LENGTH}
                value={settings.customText ?? ""}
                onInput={(e) =>
                  setSettings("customText", e.currentTarget.value)
                }
              ></textarea>
            </OptionRow>
          </Match>
        </Switch>

        <Show when={hasModifiers()}>
          <OptionRow title="modifiers">
            <Button
              variant="button"
              text="punctuation"
              fa={{ icon: "fa-at" }}
              active={settings.punctuation}
              onClick={() => setSettings("punctuation", (it) => !it)}
            />
            <Button
              variant="button"
              text="numbers"
              fa={{ icon: "fa-hashtag" }}
              active={settings.numbers}
              onClick={() => setSettings("numbers", (it) => !it)}
            />
          </OptionRow>
        </Show>

        <OptionRow title="language">
          <div class="w-full">
            <SlimSelect
              optionGroups={languageOptionGroups}
              selected={settings.language}
              onChange={(value) => {
                if (value !== undefined) {
                  setSettings("language", value as Language);
                }
              }}
            />
          </div>
        </OptionRow>
      </Show>

      <Button
        variant="button"
        type="submit"
        text="generate code"
        fa={{ icon: "fa-chevron-right" }}
        disabled={isCreating()}
      />
    </form>
  );
}

function JoinGame(props: { onFound: (game: Game) => void }): JSXElement {
  const linkCode = new URLSearchParams(window.location.search).get("code");
  const [getCode, setCode] = createSignal(linkCode?.toUpperCase() ?? "");

  const submit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault();
    try {
      props.onFound(await findGame(getCode()));
    } catch (error) {
      showErrorNotification("Could not join", { error });
    }
  };

  return (
    <form
      class="grid min-w-0 content-start gap-4"
      onSubmit={(e) => void submit(e)}
    >
      <H2 text="join a game" fa={{ icon: "fa-users" }} class="text-2xl" />
      <input
        class="w-full text-center text-4xl tracking-[0.3em] uppercase"
        aria-label="game code"
        placeholder="code"
        autocomplete="off"
        maxLength={GAME_CODE_LENGTH}
        value={getCode()}
        onInput={(e) => setCode(e.currentTarget.value.toUpperCase())}
        ref={focusOnMount}
      />
      <Button
        variant="button"
        type="submit"
        text="join"
        fa={{ icon: "fa-chevron-right" }}
        disabled={getCode().length !== GAME_CODE_LENGTH}
      />
    </form>
  );
}

function ChooseName(props: { game: Game; onBack: () => void }): JSXElement {
  const [getName, setName] = createSignal("");
  const [isJoining, setJoining] = createSignal(false);

  const submit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault();
    setJoining(true);
    try {
      await joinGame(props.game, getName());
      await navigate({ to: "/" });
    } catch (error) {
      showErrorNotification("Could not join", { error });
    }
    setJoining(false);
  };

  return (
    <form
      class="mx-auto grid w-full max-w-md content-start gap-4 text-center"
      onSubmit={(e) => void submit(e)}
    >
      <div class="text-sub">game code</div>
      <div class="text-6xl tracking-[0.2em] text-main">{props.game.code}</div>
      <div class="text-sub">{getGameLabel(props.game.settings)}</div>
      <input
        class="text-center"
        aria-label="your name"
        placeholder="your name"
        autocomplete="off"
        maxLength={20}
        value={getName()}
        onInput={(e) => setName(e.currentTarget.value)}
        ref={focusOnMount}
      />
      <Button
        variant="button"
        type="submit"
        text="play"
        fa={{ icon: "fa-play" }}
        disabled={getName().trim() === "" || isJoining()}
      />
      <Button
        variant="text"
        text="back"
        fa={{ icon: "fa-chevron-left" }}
        onClick={props.onBack}
      />
    </form>
  );
}

export function GamePage(): JSXElement {
  const [getFound, setFound] = createSignal<Game | null>(null);

  return (
    <div class="content-grid grid content-center py-8">
      <Show
        when={getFound()}
        fallback={
          <div class="grid grid-cols-[minmax(0,1fr)] gap-16 md:grid-cols-2">
            <JoinGame onFound={setFound} />
            <CreateGame onCreated={setFound} />
          </div>
        }
      >
        {(game) => <ChooseName game={game()} onBack={() => setFound(null)} />}
      </Show>
    </div>
  );
}
