import {
  AirVent,
  CarBattery,
  CircleDot,
  Cog,
  Disc3,
  Droplet,
  Engine,
  Fuel,
  Funnel,
  GitCommitHorizontal,
  LifeBuoy,
  Nut,
  Package,
  ThermometerSnowflake,
  Toolbox,
  Truck,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Checked in order, so more specific matches come first (HVAC before air
// intake, air filters under filters rather than air intake).
const RULES: [RegExp, LucideIcon][] = [
  [/hvac|air[\s-]?con|aircon|a\/c/, AirVent],
  [/filter|service/, Funnel],
  [/cool|radiator|water[\s-]?pump/, ThermometerSnowflake],
  [/exhaust|intake|turbo/, Wind],
  [/brake|braking/, Disc3],
  [/tyre|tire|wheel|rim/, CircleDot],
  [/steer|suspension|shock/, LifeBuoy],
  [/drive[\s-]?train|driveline|axle|diff/, GitCommitHorizontal],
  [/transmission|clutch|gear/, Cog],
  [/engine|motor/, Engine],
  [/battery/, CarBattery],
  [/electric|electronic|light|lamp|bulb|wiring/, Zap],
  [/fuel/, Fuel],
  [/lubricant|oil|grease|fluid/, Droplet],
  [/bolt|nut|fastener/, Nut],
  [/tool/, Toolbox],
  [/cabin|body|door|panel|mirror|bumper|fender|grill|window/, Truck],
  [/accessor/, Package],
]

/** A line icon that fits a category, chosen from its slug and name. */
export function categoryIcon(slug: string, name: string): LucideIcon {
  const text = `${slug} ${name}`.toLowerCase()
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? Wrench
}
