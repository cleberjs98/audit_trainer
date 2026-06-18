import { createHash } from "node:crypto";

type SeenObjects = WeakSet<object>;

function stringifyNormalized(value: unknown): string {
  return JSON.stringify(value) ?? "undefined";
}

function normalizeValue(input: unknown, seen: SeenObjects): unknown {
  if (input === null) {
    return null;
  }

  if (input === undefined) {
    return { $type: "undefined" };
  }

  if (input instanceof Date) {
    return { $type: "date", value: input.toISOString() };
  }

  if (typeof input === "number") {
    if (Number.isFinite(input)) {
      return input;
    }

    return { $type: "number", value: String(input) };
  }

  if (
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return input;
  }

  if (typeof input === "bigint") {
    return { $type: "bigint", value: input.toString() };
  }

  if (typeof input === "symbol" || typeof input === "function") {
    return { $type: typeof input, value: String(input) };
  }

  if (Array.isArray(input)) {
    return input.map((item) => normalizeValue(item, seen));
  }

  if (typeof input === "object") {
    if (seen.has(input)) {
      throw new TypeError("Cannot hash circular AI input");
    }

    seen.add(input);

    if (input instanceof Map) {
      const entries = Array.from(input.entries()).map(([key, value]) => [
        normalizeValue(key, seen),
        normalizeValue(value, seen),
      ]);

      entries.sort(([leftKey], [rightKey]) =>
        stringifyNormalized(leftKey).localeCompare(stringifyNormalized(rightKey)),
      );

      seen.delete(input);
      return { $type: "map", value: entries };
    }

    if (input instanceof Set) {
      const values = Array.from(input.values()).map((value) =>
        normalizeValue(value, seen),
      );

      values.sort((left, right) =>
        stringifyNormalized(left).localeCompare(stringifyNormalized(right)),
      );

      seen.delete(input);
      return { $type: "set", value: values };
    }

    const normalizedObject = Object.fromEntries(
      Object.keys(input)
        .sort()
        .map((key) => [
          key,
          normalizeValue((input as Record<string, unknown>)[key], seen),
        ]),
    );

    seen.delete(input);
    return normalizedObject;
  }

  return { $type: "unknown", value: String(input) };
}

export function normalizeAiInputForHash(input: unknown): unknown {
  return normalizeValue(input, new WeakSet<object>());
}

export function createAiInputHash(input: unknown): string {
  const normalizedInput = normalizeAiInputForHash(input);
  const serializedInput = stringifyNormalized(normalizedInput);

  return createHash("sha256").update(serializedInput).digest("hex");
}
