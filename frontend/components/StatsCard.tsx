import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgColor?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  bgColor = "from-blue-500 to-orange-500",
}: StatsCardProps) {
  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-medium text-gray-300">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-gray-500 mt-1">
              {description}
            </CardDescription>
          )}
        </div>
        {icon && (
          <div
            className={`p-2 rounded-lg bg-linear-to-br ${bgColor} text-white`}
          >
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && (
              <p
                className={`text-xs mt-1 ${
                  trend.isPositive ? "text-green-400" : "text-red-400"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
