import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { MetaDisappearingMessage } from "@/services/instagramMetaBusinessParser";

interface InstagramDisappearingMessagesProps {
  data: MetaDisappearingMessage[];
}

export const InstagramDisappearingMessages = ({ data }: InstagramDisappearingMessagesProps) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Reported Disappearing Messages
          </CardTitle>
          <CardDescription>
            Mensagens efêmeras reportadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma mensagem efêmera reportada encontrada</p>
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
            <AlertTriangle className="h-5 w-5" />
            Reported Disappearing Messages
          </CardTitle>
          <CardDescription>
            {data.length} mensagem(ns) efêmera(s) reportada(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.map((message) => (
            <Card key={message.id} className="border-l-4 border-l-destructive">
              <CardContent className="pt-6 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{message.sender}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(message.sent, 'PPpp')}
                    </div>
                  </div>
                  <Badge variant="destructive">Reported</Badge>
                </div>

                {/* Message Content */}
                <div className="p-3 bg-muted rounded-lg">
                  <MessageCircle className="h-4 w-4 text-muted-foreground mb-2" />
                  <p className="text-sm">{message.message}</p>
                </div>

                {/* Attachments */}
                {message.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Attachments:</p>
                    {message.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                        <Badge variant="outline">{att.type}</Badge>
                        {att.photoId && (
                          <span className="text-muted-foreground font-mono text-xs">
                            ID: {att.photoId}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reporter Info */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Reporter:</span>
                    <span className="font-medium">{message.reporter}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Time Reported:</span>
                    <span>{format(message.timeReported, 'PPpp')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Thread ID:</span>
                    <span className="font-mono text-xs">{message.threadId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Participants:</span>
                    <span>{message.participants.join(', ')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
