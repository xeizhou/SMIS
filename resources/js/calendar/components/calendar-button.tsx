import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { ClientContainer } from "@/calendar/components/client-container";
import { DndProviderWrapper } from "@/calendar/components/dnd/dnd-provider";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function CalendarButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarDays className="mr-2 h-4 w-4" />
          Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw]">
        <QueryClientProvider client={queryClient}>
          <DndProviderWrapper>
            <ClientContainer />
          </DndProviderWrapper>
        </QueryClientProvider>
      </DialogContent>
    </Dialog>
  );
}