import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  className?: string;
}

/**
 * Card de métrica para o dashboard
 * Exibe um valor principal com ícone e variação opcional
 */
export const MetricCard = ({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  className = "" 
}: MetricCardProps) => {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive": return "text-success";
      case "negative": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Card className={`bg-gradient-card shadow-card hover:shadow-card-hover transition-all duration-300 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground">
              {value}
            </p>
            {change && (
              <p className={`text-sm ${getChangeColor()}`}>
                {change}
              </p>
            )}
          </div>
          <div className="bg-primary/10 p-3 rounded-full">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};