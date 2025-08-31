"use client"

import { useAtomValue } from "jotai";
import { WidgetAuthSCreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { screenAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
import { WidgetLoadingScreen } from "@/modules/widget/ui/screens/widget-loading-screen";

interface Props {
    organizationId: string | null;
};

export const WidgetView = ({ organizationId }: Props) => {
    const screen = useAtomValue(screenAtom);

    const screenComponents = {
        loading: <WidgetLoadingScreen organizationId={organizationId} />,
        error: <WidgetErrorScreen />,
        auth: <WidgetAuthSCreen />,
        voice: <p>TODO: voice</p>,
        inbox: <p>TODO: inbox</p>,
        selection: <p>TODO: selection</p>,
        chat: <p>TODO: chat</p>,
        contact: <p>TODOD : contact</p>
    }
    return (
        <main className="min-h-screen min-w-screen flex h-full w-full flex-col overflow-hidden rounded-xl border bg-muted">
            {screenComponents[screen]}
        </main>
    );
};