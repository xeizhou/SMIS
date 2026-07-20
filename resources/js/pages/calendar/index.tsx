import { ClientContainer } from '@/calendar/components/client-container';
import { DndProviderWrapper } from '@/calendar/components/dnd/dnd-provider';

export default function CalendarIndex() {
    return (
        <DndProviderWrapper>
            <ClientContainer />
        </DndProviderWrapper>
    );
}