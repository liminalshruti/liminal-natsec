import { aipAvailable, callAip } from "./aip.ts";
import { callPiAi, piAiAvailable } from "./pi-ai.ts";
import type {
  SpecialistCallResult,
  SpecialistInput,
  SpecialistName
} from "./types.ts";

export interface LiveSpecialistOptions {
  aipAvailableImpl?: typeof aipAvailable;
  callAipImpl?: typeof callAip;
  piAiAvailableImpl?: typeof piAiAvailable;
  callPiAiImpl?: typeof callPiAi;
}

export async function callLiveSpecialist(
  name: SpecialistName,
  input: SpecialistInput,
  options: LiveSpecialistOptions = {}
): Promise<SpecialistCallResult | null> {
  const aipAvailableImpl = options.aipAvailableImpl ?? aipAvailable;
  const callAipImpl = options.callAipImpl ?? callAip;
  if (aipAvailableImpl()) {
    try {
      const raw = await callAipImpl(name, input);
      return { raw, source: "aip" };
    } catch {
      // Live AI is opportunistic; fall through to the next configured provider.
    }
  }

  const piAiAvailableImpl = options.piAiAvailableImpl ?? piAiAvailable;
  const callPiAiImpl = options.callPiAiImpl ?? callPiAi;
  if (piAiAvailableImpl()) {
    try {
      return await callPiAiImpl(name, input);
    } catch {
      // Keep cache/fixture deterministic path available if Pi-AI is unavailable.
    }
  }

  return null;
}
