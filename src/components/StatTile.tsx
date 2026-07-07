import { getChangeClass } from "@/lib/format";

type StatTileProps = {
  label: string;
  value: string;
  changeValue?: number;
};

// 반복되는 시세 지표를 동일한 모양으로 보여주는 작은 타일이다.
export function StatTile({ label, value, changeValue = 0 }: StatTileProps) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong className={getChangeClass(changeValue)}>{value}</strong>
    </div>
  );
}
