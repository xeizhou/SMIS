// resources/js/Pages/Dashboard/Index.jsx (or wherever that header lives)
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { ClientContainer } from "@/calendar/components/client-container";
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
      <DialogContent className="max-w-6xl w-full h-[85vh] overflow-y-auto">
        <QueryClientProvider client={queryClient}>
          <ClientContainer />
        </QueryClientProvider>
      </DialogContent>
    </Dialog>
  );
}