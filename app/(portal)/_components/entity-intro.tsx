/**
 * A small "what is this and why does it exist" card shown above the form
 * on every entity list page (roles, values, goals, tasks, time blocks) and
 * the calendar. Single source of truth for the methodology copy so the
 * SPEC.md framing stays consistent with what users actually see.
 *
 * Per SPEC.md §Core philosophy: LifeOS is a principle-based planner
 * built on the Franklin Covey role/goal/quadrant model. The intro card
 * reinforces that model by anchoring each entity to its role in the
 * planning cascade (values → roles → goals → tasks → time blocks).
 */
type Props = {
  title: string;
  description: string;
  examples: readonly string[];
};

export function EntityIntro({ title, description, examples }: Props) {
  return (
    <aside
      className="rounded-md border border-border bg-card p-4 text-sm"
      aria-label={`About ${title}`}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
        Examples
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
        {examples.map((ex) => (
          <li key={ex}>{ex}</li>
        ))}
      </ul>
    </aside>
  );
}
