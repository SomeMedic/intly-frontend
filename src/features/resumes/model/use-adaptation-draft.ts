"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { resumesApi } from "../api/resumes-api";
import type { ResumeAdaptation, ResumeAdaptationStatus, ResumeDocumentJson } from "../contracts";
import { AdaptationDraftController, type AdaptationDraftState } from "./adaptation-draft";

type UseAdaptationDraftInput = {
  adaptation: ResumeAdaptation;
  ownerId: string;
  onSaved?: (adaptation: ResumeAdaptation) => void;
  debounceMs?: number;
};

type UseAdaptationDraftResult = AdaptationDraftState & {
  busy: boolean;
  setDocument: (documentJson: ResumeDocumentJson) => void;
  setMarkdown: (markdownCache: string) => void;
  setStatus: (status: ResumeAdaptationStatus) => void;
  save: () => Promise<ResumeAdaptation | null>;
  acceptServer: (adaptation: ResumeAdaptation) => boolean;
  reloadServer: (adaptation?: ResumeAdaptation) => boolean;
  canAct: () => boolean;
};

export function useAdaptationDraft({ adaptation, ownerId, onSaved, debounceMs = 1200 }: UseAdaptationDraftInput): UseAdaptationDraftResult {
  const [, forceRender] = useReducer((value: number) => value + 1, 0);
  const onSavedRef = useRef(onSaved);
  const controller = useMemo(() => {
    return new AdaptationDraftController({
      adaptation,
      ownerId,
      storage: null,
      listener: forceRender
    });
    // The controller owns local edits; server prop refreshes are reconciled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adaptation.id, ownerId]);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  useEffect(() => {
    controller.attachStorage(safeBrowserStorage());
  }, [controller]);

  useEffect(() => {
    controller.acceptServer(adaptation);
  }, [adaptation, controller]);

  useEffect(() => {
    if (!controller.state.dirty || controller.state.saving || controller.state.error || controller.state.conflict) return;
    const timer = window.setTimeout(() => {
      void controller.save((input) => resumesApi.updateAdaptation(adaptation.id, input), onSavedRef.current, { automatic: true });
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [adaptation.id, controller, controller.state.conflict, controller.state.dirty, controller.state.editVersion, controller.state.error, controller.state.saving, debounceMs]);

  useEffect(() => {
    if (!controller.state.dirty && !controller.state.saving) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [controller, controller.state.dirty, controller.state.saving]);

  const save = useCallback(() => controller.save((input) => resumesApi.updateAdaptation(adaptation.id, input), onSavedRef.current), [adaptation.id, controller]);
  const reloadServer = useCallback((next?: ResumeAdaptation) => controller.reloadServer(next ?? adaptation), [adaptation, controller]);
  const canAct = useCallback(() => !controller.state.dirty && !controller.state.saving && !controller.state.error && !controller.state.conflict, [controller]);

  return {
    ...controller.state,
    busy: controller.state.saving,
    setDocument: controller.setDocument.bind(controller),
    setMarkdown: controller.setMarkdown.bind(controller),
    setStatus: controller.setStatus.bind(controller),
    save,
    acceptServer: controller.acceptServer.bind(controller),
    reloadServer,
    canAct
  };
}

function safeBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
