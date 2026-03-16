"use client";

import { useMemo } from "react";
import { icons } from "@iconify-json/mdi";
import { getIconData, iconToSVG, replaceIDs } from "@iconify/utils";

type MdiIconProps = {
  icon: string;
  size?: number;
  className?: string;
};

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
