export type RuleField =
  | "claim_kind"
  | "trigger"
  | "corroboration"
  | "confidence"
  | "anomaly_severity"
  | "gap_minutes"
  | "danti_geo_time_corroboration"
  | "candidate_continuity_score"
  | "aoi_id";

export type Comparator = "==" | "!=" | "<" | ">" | "<=" | ">=";
export type RuleValue = string | number | boolean;

export interface RuleCondition {
  field: RuleField;
  comparator: Comparator;
  value: RuleValue;
}

export type RuleEffect =
  | { kind: "block"; actionId: string }
  | { kind: "prefer"; actionId: string }
  | { kind: "downgrade"; actionId: string }
  | { kind: "boost"; actionId: string; priorityDelta: number };

export interface RuleAst {
  type: "rule";
  conditions: RuleCondition[];
  effects: RuleEffect[];
}

export interface ActionCandidate {
  id: string;
  score: number;
  blocked?: boolean;
  /**
   * Logical action label (e.g. "REQUEST_SAR_OR_RF_CORROBORATION"). Rule effects
   * may target either the literal `id` or this `action_type`, so callers can
   * pass long fixture object IDs (`ca:anom-...:sar-rf-sweep:...`) without
   * rewriting fixture rule effects to match.
   */
  action_type?: string;
  [key: string]: unknown;
}

export interface RuleApplication {
  matched: boolean;
  effectsApplied: RuleEffect[];
  actions: ActionCandidate[];
  rankedActions: ActionCandidate[];
}

export interface RuleParseFailure {
  line: number;
  column: number;
  index: number;
  message: string;
}

type TokenKind =
  | "WHEN"
  | "AND"
  | "THEN"
  | "IDENTIFIER"
  | "STRING"
  | "NUMBER"
  | "BOOL"
  | "COMPARATOR"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EOF";

interface Token {
  kind: TokenKind;
  value: string | number | boolean;
  line: number;
  column: number;
  index: number;
}

const VALID_FIELDS = new Set<RuleField>([
  "claim_kind",
  "trigger",
  "corroboration",
  "confidence",
  "anomaly_severity",
  "gap_minutes",
  "danti_geo_time_corroboration",
  "candidate_continuity_score",
  "aoi_id"
]);
const VALID_COMPARATORS = new Set<Comparator>(["==", "!=", "<", ">", "<=", ">="]);
const EFFECT_KINDS = new Set(["block", "prefer", "downgrade", "boost"]);

export class RuleParseError extends Error {
  line: number;
  column: number;
  index: number;

  constructor(message: string, token: Pick<Token, "line" | "column" | "index">) {
    super(`${message} at line ${token.line}, column ${token.column}`);
    this.name = "RuleParseError";
    this.line = token.line;
    this.column = token.column;
    this.index = token.index;
  }
}

export function parseRule(source: string): RuleAst {
  return new Parser(tokenize(source)).parseRule();
}

export function safeParseRule(source: string): { ok: true; ast: RuleAst } | { ok: false; error: RuleParseFailure } {
  try {
    return {
      ok: true,
      ast: parseRule(source)
    };
  } catch (error) {
    if (error instanceof RuleParseError) {
      return {
        ok: false,
        error: {
          line: error.line,
          column: error.column,
          index: error.index,
          message: error.message
        }
      };
    }

    throw error;
  }
}

export function applyRule(
  rule: RuleAst,
  context: Record<string, unknown>,
  actions: ActionCandidate[]
): RuleApplication {
  const clonedActions = actions.map((action) => ({ ...action }));
  const matched = rule.conditions.every((condition) => evaluateCondition(condition, context));
  const effectsApplied: RuleEffect[] = [];

  if (matched) {
    for (const effect of rule.effects) {
      const action = clonedActions.find(
        (candidate) =>
          candidate.id === effect.actionId ||
          candidate.action_type === effect.actionId
      );
      if (!action) continue;

      effectsApplied.push(effect);
      if (effect.kind === "block") {
        action.blocked = true;
      } else if (effect.kind === "prefer") {
        action.score += 1_000;
      } else if (effect.kind === "downgrade") {
        action.score -= 1;
      } else {
        action.score += effect.priorityDelta;
      }
    }
  }

  return {
    matched,
    effectsApplied,
    actions: clonedActions,
    rankedActions: rankActions(clonedActions)
  };
}

export function applyRules(
  rules: RuleAst[],
  context: Record<string, unknown>,
  actions: ActionCandidate[]
): RuleApplication {
  let currentActions = actions.map((action) => ({ ...action }));
  const effectsApplied: RuleEffect[] = [];
  let matched = false;

  for (const rule of rules) {
    const application = applyRule(rule, context, currentActions);
    currentActions = application.actions;
    matched = matched || application.matched;
    effectsApplied.push(...application.effectsApplied);
  }

  return {
    matched,
    effectsApplied,
    actions: currentActions,
    rankedActions: rankActions(currentActions)
  };
}

function evaluateCondition(condition: RuleCondition, context: Record<string, unknown>): boolean {
  const actual = context[condition.field];
  const expected = condition.value;

  if (condition.comparator === "==") return actual === expected;
  if (condition.comparator === "!=") return actual !== expected;

  if (typeof actual !== "number" || typeof expected !== "number") {
    return false;
  }

  if (condition.comparator === "<") return actual < expected;
  if (condition.comparator === ">") return actual > expected;
  if (condition.comparator === "<=") return actual <= expected;
  return actual >= expected;
}

function rankActions(actions: ActionCandidate[]): ActionCandidate[] {
  return actions
    .filter((action) => !action.blocked)
    .map((action) => ({ ...action }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

class Parser {
  private tokens: Token[];
  private cursor: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.cursor = 0;
  }

  parseRule(): RuleAst {
    this.expect("WHEN", "Expected WHEN");
    const conditions = [this.parseCondition()];

    while (this.match("AND")) {
      conditions.push(this.parseCondition());
    }

    this.expect("THEN", "Expected THEN");
    const effects = [this.parseEffect()];

    while (this.match("COMMA")) {
      effects.push(this.parseEffect());
    }

    this.expect("EOF", "Expected end of rule");

    return {
      type: "rule",
      conditions,
      effects
    };
  }

  private parseCondition(): RuleCondition {
    const fieldToken = this.expect("IDENTIFIER", "Expected condition field");
    const field = String(fieldToken.value);
    if (!VALID_FIELDS.has(field as RuleField)) {
      this.fail(`Unsupported condition field "${field}"`, fieldToken);
    }

    const comparatorToken = this.expect("COMPARATOR", "Expected comparator");
    const comparator = String(comparatorToken.value);
    if (!VALID_COMPARATORS.has(comparator as Comparator)) {
      this.fail(`Unsupported comparator "${comparator}"`, comparatorToken);
    }

    return {
      field: field as RuleField,
      comparator: comparator as Comparator,
      value: this.parseValue()
    };
  }

  private parseEffect(): RuleEffect {
    const effectToken = this.expect("IDENTIFIER", "Expected effect name");
    const kind = String(effectToken.value);
    if (!EFFECT_KINDS.has(kind)) {
      this.fail(`Unsupported effect "${kind}"`, effectToken);
    }

    this.expect("LPAREN", "Expected ( after effect name");
    const actionId = this.parseActionId();

    if (kind === "boost") {
      this.expect("COMMA", "Expected comma before boost priority delta");
      const deltaToken = this.expect("NUMBER", "Expected boost priority delta");
      this.expect("RPAREN", "Expected ) after boost effect");

      return {
        kind,
        actionId,
        priorityDelta: Number(deltaToken.value)
      };
    }

    this.expect("RPAREN", "Expected ) after effect");
    return {
      kind: kind as "block" | "prefer" | "downgrade",
      actionId
    };
  }

  private parseValue(): RuleValue {
    const token = this.peek();
    if (token.kind === "STRING" || token.kind === "NUMBER" || token.kind === "BOOL") {
      this.cursor += 1;
      return token.value as RuleValue;
    }

    this.fail("Expected value", token);
  }

  private parseActionId(): string {
    const token = this.peek();
    if (token.kind !== "STRING" && token.kind !== "IDENTIFIER") {
      this.fail("Expected action_id", token);
    }

    this.cursor += 1;
    return String(token.value);
  }

  private match(kind: TokenKind): boolean {
    if (this.peek().kind !== kind) return false;
    this.cursor += 1;
    return true;
  }

  private expect(kind: TokenKind, message: string): Token {
    const token = this.peek();
    if (token.kind !== kind) {
      this.fail(message, token);
    }

    this.cursor += 1;
    return token;
  }

  private peek(): Token {
    return this.tokens[this.cursor];
  }

  private fail(message: string, token: Pick<Token, "line" | "column" | "index">): never {
    throw new RuleParseError(message, token);
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  while (index < source.length) {
    const char = source[index];

    if (char === " " || char === "\t" || char === "\r") {
      index += 1;
      column += 1;
      continue;
    }

    if (char === "\n") {
      index += 1;
      line += 1;
      column = 1;
      continue;
    }

    if (char === "(") {
      tokens.push(token("LPAREN", char, line, column, index));
      index += 1;
      column += 1;
      continue;
    }

    if (char === ")") {
      tokens.push(token("RPAREN", char, line, column, index));
      index += 1;
      column += 1;
      continue;
    }

    if (char === ",") {
      tokens.push(token("COMMA", char, line, column, index));
      index += 1;
      column += 1;
      continue;
    }

    if (char === "\"") {
      const start = { line, column, index };
      let value = "";
      index += 1;
      column += 1;

      while (index < source.length && source[index] !== "\"") {
        if (source[index] === "\\") {
          const escaped = source[index + 1];
          if (escaped === "\"" || escaped === "\\") {
            value += escaped;
            index += 2;
            column += 2;
            continue;
          }
          if (escaped === "n") {
            value += "\n";
            index += 2;
            column += 2;
            continue;
          }
        }

        if (source[index] === "\n") {
          throw new RuleParseError("Unterminated string", start);
        }

        value += source[index];
        index += 1;
        column += 1;
      }

      if (index >= source.length) {
        throw new RuleParseError("Unterminated string", start);
      }

      index += 1;
      column += 1;
      tokens.push(token("STRING", value, start.line, start.column, start.index));
      continue;
    }

    const comparator = readComparator(source, index);
    if (comparator) {
      tokens.push(token("COMPARATOR", comparator, line, column, index));
      index += comparator.length;
      column += comparator.length;
      continue;
    }

    const numberValue = readNumber(source, index);
    if (numberValue) {
      tokens.push(token("NUMBER", Number(numberValue), line, column, index));
      index += numberValue.length;
      column += numberValue.length;
      continue;
    }

    const identifier = readIdentifier(source, index);
    if (identifier) {
      if (identifier === "WHEN" || identifier === "AND" || identifier === "THEN") {
        tokens.push(token(identifier, identifier, line, column, index));
      } else if (identifier === "true" || identifier === "false") {
        tokens.push(token("BOOL", identifier === "true", line, column, index));
      } else {
        tokens.push(token("IDENTIFIER", identifier, line, column, index));
      }

      index += identifier.length;
      column += identifier.length;
      continue;
    }

    throw new RuleParseError(`Unexpected token "${char}"`, { line, column, index });
  }

  tokens.push(token("EOF", "", line, column, index));
  return tokens;
}

function token(kind: TokenKind, value: string | number | boolean, line: number, column: number, index: number): Token {
  return {
    kind,
    value,
    line,
    column,
    index
  };
}

function readComparator(source: string, index: number): string | null {
  for (const comparator of ["==", "!=", "<=", ">=", "<", ">"]) {
    if (source.startsWith(comparator, index)) {
      return comparator;
    }
  }

  return null;
}

function readNumber(source: string, index: number): string | null {
  const match = /^[+-]?(?:\d+\.\d+|\d+|\.\d+)/.exec(source.slice(index));
  return match?.[0] ?? null;
}

function readIdentifier(source: string, index: number): string | null {
  const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(index));
  return match?.[0] ?? null;
}
