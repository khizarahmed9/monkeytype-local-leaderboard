import * as Misc from "./utils/misc";
import * as MonkeyPower from "./elements/monkey-power";
import * as ConnectionState from "./states/connection";
import * as AccountButton from "./elements/account-button";
import * as ServerConfiguration from "./ape/server-configuration";
import { getActiveFunboxesWithFunction } from "./test/funbox/list";
import { configLoadPromise } from "./config";
import { authPromise } from "./firebase";
import { animate } from "animejs";
import { onDOMReady, qs } from "./utils/dom";

onDOMReady(async () => {
  await configLoadPromise;
  await authPromise;

  //this line goes back to pretty much the beginning of the project and im pretty sure its here
  //to make sure the initial theme application doesnt animate the background color
  qs("body")?.setStyle({
    transition: "background .25s, transform .05s",
  });

  for (const fb of getActiveFunboxesWithFunction("applyGlobalCSS")) {
    fb.functions.applyGlobalCSS();
  }

  const app = document.querySelector("#app") as HTMLElement;
  app?.classList.remove("hidden");
  animate(app, {
    opacity: [0, 1],
    duration: Misc.applyReducedMotion(250),
  });
  if (ConnectionState.get()) {
    void ServerConfiguration.sync().then(() => {
      if (!ServerConfiguration.get()?.users.signUp) {
        AccountButton.hide();
        qs(".register")?.addClass("hidden");
        qs(".login")?.addClass("hidden");
        qs(".disabledNotification")?.removeClass("hidden");
      }
      if (!ServerConfiguration.get()?.connections.enabled) {
        // oxlint-disable-next-line no-unsafe-call
        qs(".accountButtonAndMenu .goToFriends")?.addClass("hidden");
      }
    });
  }
  MonkeyPower.init();

  if (Misc.isDevEnvironment()) {
    if ("serviceWorker" in navigator && navigator.serviceWorker !== undefined) {
      void navigator.serviceWorker
        .getRegistrations()
        .then(function (registrations) {
          for (const registration of registrations) {
            void registration.unregister();
          }
        });
    }
  } else {
    if ("serviceWorker" in navigator && navigator.serviceWorker !== undefined) {
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
