import { ClientContainer } from '@/calendar/components/client-container';
import { DndProviderWrapper } from '@/calendar/components/dnd/dnd-provider';
import type { DueDelivery } from '@/components/due-deliveries';

export default function CalendarIndex({ deliveries = [] }: { deliveries?: DueDelivery[] }) {
    return (
        <DndProviderWrapper>
            <ClientContainer deliveries={deliveries} />
        </DndProviderWrapper>
    );
}