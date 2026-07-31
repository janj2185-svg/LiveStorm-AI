from __future__ import annotations

from collections.abc import Mapping
from typing import Any

ALLOWED_FIELDS = {
    "event_type",
    "text",
    "actor_platform_id",
    "actor_display_name",
    "monetary_minor",
    "currency",
}
ALLOWED_OPERATORS = {"eq", "ne", "contains", "starts_with", "in", "gte", "lte", "exists"}
MAX_CONDITION_DEPTH = 4
MAX_CONDITION_NODES = 32


def validate_condition_dsl(value: Mapping[str, Any]) -> dict[str, Any]:
    """Validate a small typed expression tree. It never executes provider-supplied code."""
    node_count = 0

    def validate_node(node: Any, depth: int) -> dict[str, Any]:
        nonlocal node_count
        node_count += 1
        if node_count > MAX_CONDITION_NODES or depth > MAX_CONDITION_DEPTH:
            raise ValueError("condition DSL exceeds its bounded complexity")
        if not isinstance(node, Mapping) or not node:
            raise ValueError("condition nodes must be non-empty objects")
        keys = set(node)
        boolean_keys = keys & {"all", "any", "not"}
        if boolean_keys:
            if len(boolean_keys) != 1 or keys != boolean_keys:
                raise ValueError("boolean condition nodes contain exactly one operator")
            operator = next(iter(boolean_keys))
            children = node[operator]
            if operator == "not":
                return {"not": validate_node(children, depth + 1)}
            if not isinstance(children, list) or not 1 <= len(children) <= 16:
                raise ValueError(f"{operator} requires between 1 and 16 conditions")
            return {operator: [validate_node(child, depth + 1) for child in children]}

        if keys != {"field", "op", "value"}:
            raise ValueError("comparison nodes require field, op, and value")
        field = node["field"]
        operator = node["op"]
        operand = node["value"]
        if not isinstance(field, str) or (
            field not in ALLOWED_FIELDS and not field.startswith("metadata.")
        ):
            raise ValueError("condition field is not allowed")
        if field.startswith("metadata.") and (
            len(field) > 105
            or len(field.split(".")) != 2
            or not field.removeprefix("metadata.").replace("_", "").isalnum()
        ):
            raise ValueError("metadata condition field is invalid")
        if operator not in ALLOWED_OPERATORS:
            raise ValueError("condition operator is not allowed")
        if operator == "exists":
            if not isinstance(operand, bool):
                raise ValueError("exists requires a boolean value")
        elif operator == "in":
            if not isinstance(operand, list) or not 1 <= len(operand) <= 32:
                raise ValueError("in requires a bounded non-empty list")
            if any(not isinstance(item, (str, int, float, bool)) for item in operand):
                raise ValueError("in values must be scalar")
        elif not isinstance(operand, (str, int, float, bool)):
            raise ValueError("comparison values must be scalar")
        if isinstance(operand, str) and len(operand) > 500:
            raise ValueError("condition string is too long")
        if operator in {"contains", "starts_with"} and not isinstance(operand, str):
            raise ValueError(f"{operator} requires a string value")
        if operator in {"gte", "lte"} and (
            isinstance(operand, bool) or not isinstance(operand, (int, float))
        ):
            raise ValueError(f"{operator} requires a numeric value")
        return {"field": field, "op": operator, "value": operand}

    if not value:
        return {}
    return validate_node(value, 0)


def evaluate_condition(condition: Mapping[str, Any], event: Mapping[str, Any]) -> bool:
    if not condition:
        return True
    if "all" in condition:
        return all(evaluate_condition(child, event) for child in condition["all"])
    if "any" in condition:
        return any(evaluate_condition(child, event) for child in condition["any"])
    if "not" in condition:
        return not evaluate_condition(condition["not"], event)
    field = str(condition["field"])
    if field.startswith("metadata."):
        actual = event.get("metadata", {}).get(field.removeprefix("metadata."))
    else:
        actual = event.get(field)
    operator = condition["op"]
    operand = condition["value"]
    if operator == "exists":
        return (actual is not None) is operand
    if operator == "eq":
        return actual == operand
    if operator == "ne":
        return actual != operand
    if operator == "in":
        return actual in operand
    if operator == "contains":
        return isinstance(actual, str) and operand.casefold() in actual.casefold()
    if operator == "starts_with":
        return isinstance(actual, str) and actual.casefold().startswith(operand.casefold())
    if operator in {"gte", "lte"}:
        if isinstance(actual, bool) or not isinstance(actual, (int, float)):
            return False
        return actual >= operand if operator == "gte" else actual <= operand
    return False
