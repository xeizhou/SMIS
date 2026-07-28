import { useTranslation } from "react-i18next";
import { useMemo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendarUser } from "@/stores/calendar-store";
import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  events: IEvent[];
}

export function UserSelect({ events }: IProps) {
  const { selectedUserId, setSelectedUserId } = useCalendarUser();
  
  const users = useMemo(() => {
    const uniqueUsersMap = new Map();
    events.forEach(event => {
      if (event.user && event.user.id && !uniqueUsersMap.has(event.user.id)) {
        uniqueUsersMap.set(event.user.id, event.user);
      }
    });
    return Array.from(uniqueUsersMap.values());
  }, [events]);

  const { t } = useTranslation('calendar');

  return (
    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
      <SelectTrigger className="flex-1 md:w-48">
        <SelectValue />
      </SelectTrigger>

      <SelectContent align="end">
        <SelectItem value="all">
          <div className="flex items-center gap-1">
            <AvatarGroup max={2}>
              {users.map(user => (
                <Avatar key={user.id} className="size-6 text-xxs">
                  <AvatarImage src={user.picturePath ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-xxs">{user.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            {t("userSelect.all")}
          </div>
        </SelectItem>

        {users.map(user => (
          <SelectItem key={user.id} value={user.id} className="flex-1">
            <div className="flex items-center gap-2">
              <Avatar key={user.id} className="size-6">
                <AvatarImage src={user.picturePath ?? undefined} alt={user.name} />
                <AvatarFallback className="text-xxs">{user.name[0]}</AvatarFallback>
              </Avatar>

              <p className="truncate">{user.name}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
