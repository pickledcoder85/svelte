"""Goals, weight entries and weekly metrics."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import uuid4

from backend.app.models.nutrition import MacroTargets, WeeklyMetrics

from ._base import _synchronized


class GoalsMixin:
    @_synchronized
    def get_weekly_metrics(self) -> WeeklyMetrics:
        row = self._connection.execute("SELECT * FROM weekly_metrics WHERE id = 1").fetchone()
        if row is None:
            return WeeklyMetrics(
                calorie_goal=0,
                calories_consumed=0,
                macro_targets=MacroTargets(protein=0, carbs=0, fat=0),
                macro_consumed=MacroTargets(protein=0, carbs=0, fat=0),
                weekly_weight_change=0.0,
                adherence_score=0,
            )
        return WeeklyMetrics(
            calorie_goal=row["calorie_goal"],
            calories_consumed=row["calories_consumed"],
            macro_targets=MacroTargets(
                protein=row["protein_target"],
                carbs=row["carbs_target"],
                fat=row["fat_target"],
            ),
            macro_consumed=MacroTargets(
                protein=row["protein_consumed"],
                carbs=row["carbs_consumed"],
                fat=row["fat_consumed"],
            ),
            weekly_weight_change=row["weekly_weight_change"],
            adherence_score=row["adherence_score"],
        )

    def save_user_goal(
        self,
        *,
        user_id: str,
        effective_at: date,
        calorie_goal: int,
        protein_goal: float,
        carbs_goal: float,
        fat_goal: float,
        fiber_goal: float | None = None,
        goal_type: str | None = None,
        goal_pace: str | None = None,
        calculation_version: str | None = None,
        target_source: str | None = None,
        target_weight_lbs: float | None = None,
        goal_id: str | None = None,
    ) -> dict[str, Any]:
        identifier = goal_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO user_goals (
                    id, user_id, effective_at, calorie_goal, protein_goal,
                    carbs_goal, fat_goal, fiber_goal, goal_type, goal_pace,
                    calculation_version, target_source, target_weight_lbs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id = excluded.user_id,
                    effective_at = excluded.effective_at,
                    calorie_goal = excluded.calorie_goal,
                    protein_goal = excluded.protein_goal,
                    carbs_goal = excluded.carbs_goal,
                    fat_goal = excluded.fat_goal,
                    fiber_goal = excluded.fiber_goal,
                    goal_type = excluded.goal_type,
                    goal_pace = excluded.goal_pace,
                    calculation_version = excluded.calculation_version,
                    target_source = excluded.target_source,
                    target_weight_lbs = excluded.target_weight_lbs
                """,
                (
                    identifier,
                    user_id,
                    effective_at.isoformat(),
                    calorie_goal,
                    protein_goal,
                    carbs_goal,
                    fat_goal,
                    fiber_goal,
                    goal_type,
                    goal_pace,
                    calculation_version,
                    target_source,
                    target_weight_lbs,
                ),
            )
        goal = self.get_user_goal(identifier)
        if goal is None:
            raise RuntimeError("Failed to persist user goal.")
        return goal

    @_synchronized
    def get_user_goal(self, goal_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM user_goals WHERE id = ?",
            (goal_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_user_goals(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """
            SELECT * FROM user_goals
            WHERE user_id = ?
            ORDER BY effective_at DESC, created_at DESC, rowid DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    @_synchronized
    def weight_on_or_before(self, user_id: str, on: date) -> float | None:
        """The latest weigh-in on or before a day (recorded_at may carry a time)."""
        row = self._connection.execute(
            """
            SELECT weight_lbs FROM weight_entries
            WHERE user_id = ? AND substr(recorded_at, 1, 10) <= ?
            ORDER BY recorded_at DESC, created_at DESC LIMIT 1
            """,
            (user_id, on.isoformat()),
        ).fetchone()
        return float(row["weight_lbs"]) if row is not None else None

    def record_weight_entry(
        self,
        *,
        user_id: str,
        recorded_at: date,
        weight_lbs: float,
        entry_id: str | None = None,
    ) -> str:
        identifier = entry_id or str(uuid4())
        self._ensure_user_exists(user_id)
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO weight_entries (id, user_id, recorded_at, weight_lbs)
                VALUES (?, ?, ?, ?)
                """,
                (identifier, user_id, recorded_at.isoformat(), weight_lbs),
            )
        return identifier

    @_synchronized
    def get_weight_entry(self, entry_id: str) -> dict[str, Any] | None:
        row = self._connection.execute(
            "SELECT * FROM weight_entries WHERE id = ?",
            (entry_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    @_synchronized
    def list_weight_entries(
        self,
        user_id: str,
        *,
        recorded_start: date | None = None,
        recorded_end: date | None = None,
    ) -> list[dict[str, Any]]:
        clauses = ["user_id = ?"]
        params: list[Any] = [user_id]

        if recorded_start is not None:
            clauses.append("recorded_at >= ?")
            params.append(recorded_start.isoformat())

        if recorded_end is not None:
            clauses.append("recorded_at <= ?")
            params.append(recorded_end.isoformat())

        rows = self._connection.execute(
            f"""
            SELECT *
            FROM weight_entries
            WHERE {' AND '.join(clauses)}
            ORDER BY recorded_at ASC, created_at ASC, id ASC
            """,
            params,
        ).fetchall()
        return [dict(row) for row in rows]

    @_synchronized
    def latest_activity_date(self, user_id: str) -> date | None:
        row = self._connection.execute(
            """
            SELECT MAX(activity_date) AS activity_date
            FROM (
                SELECT MAX(recorded_at) AS activity_date
                FROM weight_entries
                WHERE user_id = ?
                UNION ALL
                SELECT MAX(log_date) AS activity_date
                FROM food_logs
                WHERE user_id = ?
            )
            """,
            (user_id, user_id),
        ).fetchone()
        if row is None or row["activity_date"] is None:
            return None
        return date.fromisoformat(row["activity_date"])

    @_synchronized
    def get_weekly_metrics_for_user(
        self,
        *,
        user_id: str,
        week_start: date | None = None,
        week_end: date | None = None,
    ) -> WeeklyMetrics:
        if week_start is None or week_end is None:
            return self.get_weekly_metrics()

        goal_row = self._connection.execute(
            """
            SELECT * FROM user_goals
            WHERE user_id = ? AND effective_at <= ?
            ORDER BY effective_at DESC, created_at DESC
            LIMIT 1
            """,
            (user_id, week_end.isoformat()),
        ).fetchone()

        totals_row = self._connection.execute(
            """
            SELECT
                COALESCE(SUM(entries.calories), 0) AS calories,
                COALESCE(SUM(entries.protein), 0) AS protein,
                COALESCE(SUM(entries.carbs), 0) AS carbs,
                COALESCE(SUM(entries.fat), 0) AS fat
            FROM food_log_entries entries
            JOIN food_logs logs ON logs.id = entries.food_log_id
            WHERE logs.user_id = ?
              AND logs.log_date >= ?
              AND logs.log_date <= ?
            """,
            (user_id, week_start.isoformat(), week_end.isoformat()),
        ).fetchone()

        weight_rows = self.list_weight_entries(
            user_id,
            recorded_start=week_start,
            recorded_end=week_end,
        )

        if goal_row is None:
            return self.get_weekly_metrics()

        calories_consumed = int(round(float(totals_row["calories"])))
        calorie_goal = int(goal_row["calorie_goal"])
        protein_consumed = float(totals_row["protein"])
        carbs_consumed = float(totals_row["carbs"])
        fat_consumed = float(totals_row["fat"])

        if calorie_goal <= 0:
            adherence_score = 0
        else:
            adherence_score = min(int(round((calories_consumed / calorie_goal) * 100)), 100)

        weekly_weight_change = 0.0
        if len(weight_rows) >= 2:
            weekly_weight_change = round(
                float(weight_rows[-1]["weight_lbs"]) - float(weight_rows[0]["weight_lbs"]),
                1,
            )

        return WeeklyMetrics(
            calorie_goal=calorie_goal,
            calories_consumed=calories_consumed,
            macro_targets=MacroTargets(
                protein=float(goal_row["protein_goal"]),
                carbs=float(goal_row["carbs_goal"]),
                fat=float(goal_row["fat_goal"]),
            ),
            macro_consumed=MacroTargets(
                protein=protein_consumed,
                carbs=carbs_consumed,
                fat=fat_consumed,
            ),
            weekly_weight_change=weekly_weight_change,
            adherence_score=adherence_score,
        )
