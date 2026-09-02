<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delivery Follow-Up</title>
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
                                            Delivery Follow-Up Notice
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
                                Dear Supply Management Unit,
                            </p>

                            <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
                                This is an automated internal notification that a formal follow-up is required regarding the delivery for Reference/PO Number <strong style="color:#111827;">{{ $delivery->po_number ?? 'N/A' }}</strong>.
                            </p>

                            {{-- Detail card --}}
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; margin-bottom:24px;">
                                <tr>
                                    <td style="padding:16px 20px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px; width:160px;">Supplier</td>
                                                <td style="padding:4px 0; color:#111827; font-size:13px; font-weight:600;">{{ $delivery->supplier->supplier_name ?? 'N/A' }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px;">Contact Person</td>
                                                <td style="padding:4px 0; color:#111827; font-size:13px; font-weight:600;">{{ $delivery->supplier->contact_person ?? 'N/A' }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px;">Contact Number</td>
                                                <td style="padding:4px 0; color:#111827; font-size:13px; font-weight:600;">{{ $delivery->supplier->contact_number ?? 'N/A' }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px;">Email Address</td>
                                                <td style="padding:4px 0; color:#111827; font-size:13px; font-weight:600;">
                                                    @if(!empty($delivery->supplier->email_address))
                                                        <a href="mailto:{{ $delivery->supplier->email_address }}" style="color:#2563eb; text-decoration:none;">{{ $delivery->supplier->email_address }}</a>
                                                    @else
                                                        N/A
                                                    @endif
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px;">Expected Delivery Date</td>
                                                <td style="padding:4px 0; color:#111827; font-size:13px; font-weight:600;">{{ $delivery->due_date ? \Carbon\Carbon::parse($delivery->due_date)->format('F j, Y') : 'N/A' }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0; color:#6b7280; font-size:13px;">Status</td>
                                                <td style="padding:4px 0;">
                                                    <span style="display:inline-block; background-color:#dbeafe; color:#1e40af; font-size:12px; font-weight:600; padding:2px 10px; border-radius:9999px;">
                                                        {{ $delivery->status ?? 'Pending' }}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            @if(!empty($customMessage))
                            <div style="background-color:#fffbeb; border-left:4px solid #f59e0b; padding:16px; margin-bottom:24px;">
                                <p style="margin:0 0 8px; color:#92400e; font-size:13px; font-weight:600;">
                                    Message from {{ config('app.name') }}:
                                </p>
                                <p style="margin:0; color:#92400e; font-size:14px; line-height:1.5; white-space: pre-wrap;">{{ $customMessage }}</p>
                            </div>
                            @endif

                            <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
                                Please contact the supplier directly using the information provided above to request an updated delivery status.
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
