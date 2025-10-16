import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Image, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ProcessedInstagramData } from "@/services/instagramParserService";

interface InstagramNCMECProps {
  data: ProcessedInstagramData;
}

export const InstagramNCMEC = ({ data }: InstagramNCMECProps) => {
  const reports = data.ncmecReports || [];
  
  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            NCMEC Reports
          </CardTitle>
          <CardDescription>
            NCMEC cybertip reports associados à conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No responsive records located</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            NCMEC Reports
          </CardTitle>
          <CardDescription>
            {reports.length} NCMEC cybertip report(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-6 space-y-3">
                {/* Header */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Report ID</p>
                  <p className="font-mono text-sm">{report.id}</p>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Report Date</p>
                  <p className="text-sm">{format(report.reportDate, 'PPpp')}</p>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Content Type</p>
                  <Badge variant="outline">{report.contentType}</Badge>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{report.status}</Badge>
                </div>
                
                {report.description && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{report.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
