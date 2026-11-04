import { JSXElement } from "solid-js";

import { AlertsModal } from "./alerts/AlertsModal";
import { CommandlineModal } from "./CommandlineModal";
import { CustomTestDurationModal } from "./CustomTestDurationModal";
import { CustomTextModal } from "./CustomTextModal";
import { CustomWordAmountModal } from "./CustomWordAmountModal";
import { MobileTestConfigModal } from "./MobileTestConfigModal";
import { PractiseWordsModal } from "./PractiseWordsModal";
import { QuoteSearchModal } from "./QuoteSearchModal";
import { ShareTestSettings } from "./ShareTestSettings";
import { SimpleModal } from "./SimpleModal";
import { TheRestModal } from "./TheRestModal";

export function Modals(): JSXElement {
  return (
    <>
      <CommandlineModal />
      <AlertsModal />
      <SimpleModal />
      <CustomTextModal />
      <QuoteSearchModal />
      <CustomTestDurationModal />
      <CustomWordAmountModal />
      <PractiseWordsModal />
      <ShareTestSettings />
      <MobileTestConfigModal />
      <TheRestModal />
    </>
  );
}
