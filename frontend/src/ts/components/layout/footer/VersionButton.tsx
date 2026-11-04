import { JSXElement } from "solid-js";
import { envConfig } from "virtual:env-config";

import { isDevEnvironment } from "../../../utils/env";
import { Fa } from "../../common/Fa";

export function VersionButton(): JSXElement {
  const getVersionText = (): string =>
    isDevEnvironment() ? "localhost" : envConfig.clientVersion;

  return (
    <div class="flex items-center gap-[0.5em] p-[0.5em]">
      <Fa icon="fa-code-branch" fixedWidth />
      <div class="text">{getVersionText()}</div>
    </div>
  );
}
