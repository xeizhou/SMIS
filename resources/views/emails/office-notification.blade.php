<!DOCTYPE html>
<html>
<head>
    <title>Purchase Order Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>Purchase Order Notification</h2>
    
    <p>Good day,</p>

    <p>Please be informed that a Purchase Order (<strong>{{ $servePo->po_number }}</strong>) for your office is now ready for your review and action.</p>

    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Purchase Order Details:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>PO Number:</strong> {{ $servePo->po_number }}</li>
            <li><strong>Supplier:</strong> {{ $servePo->supplier->supplier_name ?? 'N/A' }}</li>
            <li><strong>Description:</strong> {{ $servePo->item_description ?? 'N/A' }}</li>
        </ul>
    </div>

    <p>Kindly coordinate with the procurement office for further steps regarding this Purchase Order.</p>

    <p>Best regards,<br>
    SMIS System</p>
</body>
</html>
