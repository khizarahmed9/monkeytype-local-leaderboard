import * as MonkeyPower from "./elements/monkey-power";
import { configLoadPromise } from "./config/lifecycle";
import { onDOMReady } from "./utils/dom";
import { isDevEnvironment } from "./utils/env";
import { setAppReady } from "./states/core";

onDOMReady(async () => {
  await configLoadPromise;

  setAppReady(true);

  MonkeyPower.init();

  if (isDevEnvironment()) {
    void navigator.serviceWorker
      .getRegistrations()
      .then(function (registrations) {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });
  } else {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.log(
              "ServiceWorker registration successful with scope: ",
              registration.scope,
            );
          })
          .catch((error: unknown) => {
            console.error("ServiceWorker registration failed: ", error);
          });
      });
    }
  }
});
