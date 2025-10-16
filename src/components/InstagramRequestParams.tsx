import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Hash, Link2, Shield, User } from "lucide-react";
import { format } from "date-fns";
import { MetaRequestParameters } from "@/services/instagramMetaBusinessParser";

interface InstagramRequestParamsProps {
  data: MetaRequestParameters;
}

export const InstagramRequestParams = ({ data }: InstagramRequestParamsProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Parameters
          </CardTitle>
          <CardDescription>
            Informações sobre o relatório gerado pelo Meta Business Record
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Service</p>
                <p className="text-base font-semibold">{data.service}</p>
              </div>
            </div>

            {/* Ticket Number */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Hash className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Internal Ticket Number</p>
                <p className="text-base font-semibold">{data.internalTicketNumber}</p>
              </div>
            </div>

            {/* Target */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <User className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Target (Instagram ID)</p>
                <p className="text-base font-semibold font-mono">{data.target}</p>
              </div>
            </div>

            {/* Account Identifier */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Link2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Account Identifier</p>
                <a 
                  href={data.accountIdentifier} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-primary hover:underline break-all"
                >
                  {data.accountIdentifier}
                </a>
              </div>
            </div>

            {/* Account Type */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Badge variant="outline" className="mt-1">
                {data.accountType}
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Account Type</p>
              </div>
            </div>

            {/* Generated Date */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Generated</p>
                <p className="text-base font-semibold">
                  {format(data.generated, 'PPpp')}
                </p>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-2">Date Range</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {format(data.dateRange.start, 'PPP')}
              </Badge>
              <span className="text-muted-foreground">to</span>
              <Badge variant="secondary">
                {format(data.dateRange.end, 'PPP')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
