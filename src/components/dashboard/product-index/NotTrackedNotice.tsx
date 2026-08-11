import { IconLayers } from '../../ui/Icon';

interface NotTrackedNoticeProps {
  brandName: string;
  reason: string;
}

/** Stands in for a company's section on a Product Index tab when the
 * backend structurally can't populate this metric for that site (not a
 * loading state, not "zero data this week") — see Company.capabilities. */
export function NotTrackedNotice({ brandName, reason }: NotTrackedNoticeProps) {
  return (
    <div className="not-tracked">
      <IconLayers />
      <div>
        <div className="not-tracked-title">{brandName} — not tracked yet</div>
        <div className="text-muted">{reason}</div>
      </div>
    </div>
  );
}
