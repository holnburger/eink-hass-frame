"use client";

import { useMemo } from "react";
import { icons } from "@iconify-json/mdi";
import { getIconData, iconToSVG, replaceIDs } from "@iconify/utils";

type MdiIconProps = {
  icon: string;
  size?: number;
  className?: string;
};

const MDI_ICON_NAMES = Object.keys(icons.icons ?? {}).sort((left, right) =>
  left.localeCompare(right),
);

export function getAllMdiIconNames() {
  return MDI_ICON_NAMES;
}

export function formatMdiIconLabel(iconName: string) {
  return iconName
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function MdiIcon({ icon, size = 24, className = "" }: MdiIconProps) {
  const rendered = useMemo(() => {
    const iconData = getIconData(icons, icon);
    if (!iconData) {
      return null;
    }
    const svg = iconToSVG(iconData, { width: `${size}`, height: `${size}` });
    return {
      viewBox: String(svg.attributes.viewBox ?? "0 0 24 24"),
      body: replaceIDs(svg.body),
    };
  }, [icon, size]);

  if (!rendered) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={rendered.viewBox}
      className={className}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: rendered.body }}
    />
  );
}
