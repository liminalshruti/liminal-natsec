import { parseRule } from "./dsl.ts";

export const R001_DSL =
  "WHEN gap_minutes >= 20 AND candidate_continuity_score >= 0.65 AND danti_geo_time_corroboration == true AND aoi_id == \"aoi:alara-eez-box-01\" THEN boost(\"REQUEST_SAR_OR_RF_CORROBORATION\", +1)";

export const R001_RULE = parseRule(R001_DSL);
