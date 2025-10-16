import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Image, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { MetaNCMECReport } from "@/services/instagramMetaBusinessParser";

interface InstagramNCMECProps {
  data: MetaNCMECReport[];
}

export const InstagramNCMEC = ({ data }: InstagramNCMECProps) => {
  if (data.length === 0) {
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
            {data.length} NCMEC cybertip report(s) found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.map((report) => (
            <Card key={report.id} className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-6 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    {report.cyberTipId && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-semibold">CyberTip ID: {report.cyberTipId}</span>
                      </div>
                    )}
                    {report.time && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(report.time, 'PPpp')}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="border-yellow-500">NCMEC</Badge>
                </div>

                {/* Responsible ID */}
                {report.responsibleId && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Responsible ID</p>
                    <p className="font-mono text-sm">{report.responsibleId}</p>
                  </div>
                )}

                {/* Media Uploaded */}
                {report.mediaUploaded.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Media uploaded in this cybertip:</p>
                    </div>
                    {report.mediaUploaded.map((media, idx) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">ID:</span>
                          <span className="font-mono">{media.id}</span>
                        </div>
                        {media.uploadTime && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Upload Time:</span>
                            <span>{format(media.uploadTime, 'PPpp')}</span>
                          </div>
                        )}
                        {media.ncmecFileId && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">NCMEC File ID:</span>
                            <span className="font-mono">{media.ncmecFileId}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recipients */}
                {report.recipients.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Recipients:</p>
                    <div className="flex flex-wrap gap-2">
                      {report.recipients.map((recipient, idx) => (
                        <Badge key={idx} variant="secondary">{recipient}</Badge>
                      ))}
                    </div>
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
