<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Order Ready for Pickup</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

                    {{-- Header --}}
                    <tr>
                        <td style="background-color:#612A35; padding:24px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <p style="margin:0; color:#ffffff; font-size:12px; letter-spacing:0.5px; text-transform:uppercase; opacity:0.85;">
                                            Supply Management Unit
                                        </p>
                                        <p style="margin:4px 0 0; color:#ffffff; font-size:20px; font-weight:600;">
                                            P.O. from OVPAD
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px; color:#1f2937; font-size:15px; line-height:1.6;">
                                Dear End-User,
                            </p>

                            <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
                                This is to inform you that your Purchase Order (PO) document with Purchase Order No.
                                <strong style="color:#111827;">{{ $poNumber }}</strong> is now ready for pickup at
                                the Supply Management Unit.
                            </p>

                            {{-- Detail card --}}
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; margin-bottom:24px;">
                                <tr>
                                    <td style="padding:16px 20px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px; width:140px;">Purchase Order No.</td>
                                                <td style="padding:4px 0; color:#111827; font-size:13px; font-weight:600;">{{ $poNumber }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px;">Status</td>
                                                <td style="padding:4px 0;">
                                                    <span style="display:inline-block; background-color:#fef3c7; color:#92400e; font-size:12px; font-weight:600; padding:2px 10px; border-radius:9999px;">
                                                        Ready for Pickup
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
                                Kindly visit our office at your earliest convenience to claim your Purchase Order.
                            </p>

                            <p style="margin:0; color:#374151; font-size:15px; line-height:1.6;">
                                Thank you.
                            </p>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="padding:20px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
                            <p style="margin:0 0 4px; color:#111827; font-size:13px; font-weight:600;">
                                Supply Management Unit
                            </p>
                            <p style="margin:0 0 12px; color:#6b7280; font-size:13px;">
                                University of Southeastern Philippines
                            </p>
                            <p style="margin:0; color:#9ca3af; font-size:11px; line-height:1.5;">
                                This is a system-generated email. Please do not reply directly to this message.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>