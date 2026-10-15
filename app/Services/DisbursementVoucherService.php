<?php

namespace App\Services;

use App\Models\ServePo;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Calculation\Calculation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class DisbursementVoucherService
{
    /**
     * Path to the template file matching the official Google Sheet reference.
     */
    protected string $templatePath;

    /**
     * Path to the Neither LD nor retention template file.
     */
    protected string $neitherTemplatePath;

    /**
     * Path to the Retention Only template file.
     */
    protected string $retentionTemplatePath;

    /**
     * Path to the Both LD and retention template file.
     */
    protected string $bothTemplatePath;

    public function __construct(
        ?string $templatePath = null,
        ?string $neitherTemplatePath = null,
        ?string $retentionTemplatePath = null,
        ?string $bothTemplatePath = null
    ) {
        $this->templatePath = $templatePath ?: resource_path('templates/disbursement_voucher_template_LD.xlsx');
        $this->neitherTemplatePath = $neitherTemplatePath ?: resource_path('templates/disbursement_voucher_template_Neither.xlsx');

        if ($retentionTemplatePath) {
            $this->retentionTemplatePath = $retentionTemplatePath;
        } elseif (file_exists(resource_path('templates/disbursement_voucher_template_Retention.xlsx'))) {
            $this->retentionTemplatePath = resource_path('templates/disbursement_voucher_template_Retention.xlsx');
        } else {
            $this->retentionTemplatePath = resource_path('templates/disbursement_voucher_template_Retention.xlsx');
        }

        if ($bothTemplatePath) {
            $this->bothTemplatePath = $bothTemplatePath;
        } elseif (file_exists(resource_path('templates/disbursement_voucher_template_Both.xlsx'))) {
            $this->bothTemplatePath = resource_path('templates/disbursement_voucher_template_Both.xlsx');
        } else {
            $this->bothTemplatePath = resource_path('templates/disbursement_voucher_template_Both.xlsx');
        }
    }

    /**
     * Generate an Excel spreadsheet Disbursement Voucher (LD-Only Template)
     * using the official reference template layout.
     */
    public function generateLdOnlyExcel(ServePo $po, float $ldAmount = 0.0): Spreadsheet
    {
        // Load relationships
        $po->loadMissing(['supplier', 'fundCluster']);

        $fundClusterText = $po->fund_cluster_id
            ?: ($po->fundCluster?->fund_cluster_id ?? '');

        $responsibilityCenter = $fundClusterText;

        $orsBursNo = trim($po->ors_burs_no ?? '');
        $orsBursDate = $po->ors_burs_date;
        $orsBursDateStr = '';
        if (! empty($orsBursDate)) {
            try {
                $dateObj = $orsBursDate instanceof \DateTimeInterface
                    ? $orsBursDate
                    : Carbon::parse($orsBursDate);
                $orsBursDateStr = $dateObj->format('m/d/Y');
            } catch (\Throwable $e) {
                $orsBursDateStr = '';
            }
        }

        $orsBursText = $orsBursNo;
        if (! empty($orsBursDateStr)) {
            $orsBursText = ! empty($orsBursText)
                ? "{$orsBursText}\ndtd: {$orsBursDateStr}"
                : "dtd: {$orsBursDateStr}";
        }

        $supplierName = $po->supplier?->supplier_name ?? '';
        $supplierAddress = $po->supplier?->address ?? '';
        $poAmount = (float) ($po->total_amount_po ?? 0);
        $ldAmount = max(0.0, min($ldAmount, $poAmount));

        // Calculations for Amount in Words
        $afterLd = $poAmount - $ldAmount;
        $tax1 = round($afterLd / 1.12 * 0.01, 2);
        $tax5 = round($afterLd / 1.12 * 0.05, 2);
        $finalPayable = max(0.0, $afterLd - ($tax1 + $tax5));
        $amountInWords = $this->amountToWords($finalPayable);

        $itemDescription = trim($po->item_description ?? '');
        if (empty($itemDescription)) {
            $itemDescription = 'ICT Equipment';
        } else {
            // Normalize internal whitespace
            $itemDescription = preg_replace('/\s+/', ' ', $itemDescription);
        }

        if (file_exists($this->templatePath)) {
            $spreadsheet = IOFactory::load($this->templatePath);
            $sheet = $spreadsheet->getActiveSheet();

            // 1. Fund Cluster: Label in AA2, Value in AA4 (centered, bold)
            $sheet->setCellValue('AA2', 'Fund Cluster : ');
            if (! empty($fundClusterText)) {
                $sheet->setCellValue('AA4', $fundClusterText);
                $sheet->getStyle('AA4')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('AA4')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);
            } else {
                $sheet->setCellValue('AA4', null);
            }

            // 2. Payee (Supplier Name) in D11
            $sheet->setCellValue('D11', $supplierName);
            $sheet->getStyle('D11')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('D11')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 3. TIN/Employee No. (must remain empty in R12)
            $sheet->setCellValue('R12', null);

            // 4. ORS/BURS No. & Date in AA12
            $sheet->setCellValue('AA12', ! empty($orsBursText) ? $orsBursText : null);
            $sheet->getStyle('AA12')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('AA12')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                ->setVertical(Alignment::VERTICAL_CENTER);

            // 5. Address in D13
            $sheet->setCellValue('D13', $supplierAddress);
            $sheet->getStyle('D13')->getFont()->setName('Cambria')->setSize(10);
            $sheet->getStyle('D13')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 6. Particulars text
            $particularsText = 'To payment for the purchase of '.$itemDescription.' amounting to...';
            $sheet->setCellValue('A17', $particularsText);
            $sheet->getStyle('A17')->getFont()->setName('Cambria')->setSize(9);
            $sheet->getStyle('A17')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);

            // 7. Responsibility Center (based on what's the fund cluster) in Q17
            if (! empty($responsibilityCenter)) {
                $sheet->setCellValue('Q17', $responsibilityCenter);
                $sheet->getStyle('Q17')->getFont()->setName('Cambria')->setSize(10);
                $sheet->getStyle('Q17')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('Q17', null);
            }

            // 8. MFO/PAP (must remain empty in V17)
            $sheet->setCellValue('V17', null);

            // 9. Calculation Rows (Formulas & Values)
            $numFormat = '_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)';

            // K22: Gross Amount
            $sheet->setCellValue('K22', $poAmount > 0 ? $poAmount : null);
            $sheet->getStyle('K22')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K22')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K23: LD Amount
            $sheet->setCellValue('K23', $ldAmount > 0 ? $ldAmount : ($poAmount > 0 ? 0.0 : null));
            $sheet->getStyle('K23')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K23')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K24: Amount after LD (=K22-K23)
            $sheet->setCellValue('K24', '=K22-K23');
            $sheet->getStyle('K24')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K24')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G25: Less tax 1% (=ROUND(K24/1.12*1%, 2))
            $sheet->setCellValue('G25', '=ROUND(K24/1.12*1%, 2)');
            $sheet->getStyle('G25')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G25')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G26: Less tax 5% (=ROUND(K24/1.12*5%, 2))
            $sheet->setCellValue('G26', '=ROUND(K24/1.12*5%, 2)');
            $sheet->getStyle('G26')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G26')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K26: Total Tax (=G25+G26)
            $sheet->setCellValue('K26', '=G25+G26');
            $sheet->getStyle('K26')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K26')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('K26:O26')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);

            // K27: Amount after tax / Final Amount (=K24-K26)
            $sheet->setCellValue('K27', '=K24-K26');
            $sheet->getStyle('K27')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K27')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // AA18: Amount column in table (=K27)
            $sheet->setCellValue('AA18', '=K27');

            // AA30: Amount Due row (=AA18)
            $sheet->setCellValue('AA30', '=AA18');

            // 10. Section A: Certified - End User Printed Name & Position
            $endUser = trim($po->end_user ?? '');
            if (! empty($endUser)) {
                $endUserLines = array_map('trim', explode("\n", $endUser));
                $sheet->setCellValue('A34', $endUserLines[0]);
                $sheet->getStyle('A34')->getFont()->setName('Cambria')->setSize(10)->setBold(true)->setUnderline(true);
                $sheet->getStyle('A34')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);

                if (! empty($endUserLines[1])) {
                    $sheet->setCellValue('A35', $endUserLines[1]);
                    $sheet->getStyle('A35')->getFont()->setName('Cambria')->setSize(10);
                    $sheet->getStyle('A35')->getAlignment()
                        ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                        ->setVertical(Alignment::VERTICAL_BOTTOM);
                }
            } else {
                $sheet->setCellValue('A34', null);
                $sheet->setCellValue('A35', null);
            }

            // 11. Section D: Approved for Payment - Amount in Words
            if ($finalPayable > 0) {
                $sheet->setCellValue('R44', $amountInWords);
                $sheet->getStyle('R44')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R44')->getAlignment()
                    ->setWrapText(true)
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R44', null);
            }

            // 12. Section E: Receipt of Payment - Supplier Printed Name in R63
            $sheet->setCellValue('R62', 'Printed Name: ');
            if (! empty($supplierName)) {
                $sheet->setCellValue('R63', $supplierName);
                $sheet->getStyle('R63')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R63')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R63', null);
            }

            // Ensure designated printed names in C, D remain empty
            $sheet->setCellValue('D53', null); // Section C Printed Name
            $sheet->setCellValue('V53', null); // Section D Printed Name

            // Recalculate calculation cache
            Calculation::getInstance($spreadsheet)->disableCalculationCache();
            Calculation::getInstance($spreadsheet)->clearCalculationCache();

            // Ensure Page setup is A4 portrait fit to 1 page
            $sheet->getPageSetup()
                ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
                ->setPaperSize(PageSetup::PAPERSIZE_A4)
                ->setFitToWidth(1)
                ->setFitToHeight(1);

            $sheet->getPageMargins()
                ->setTop(0.35)
                ->setBottom(0.35)
                ->setLeft(0.35)
                ->setRight(0.35);

            $sheet->getPageSetup()->setPrintArea('A1:AF64');

            return $spreadsheet;
        }

        // Fallback programmatic generation if template file is missing
        return $this->generateFallbackExcel($po, $ldAmount);
    }

    /**
     * Generate an Excel spreadsheet Disbursement Voucher (Neither LD nor retention Template).
     */
    public function generateNeitherExcel(ServePo $po): Spreadsheet
    {
        // Load relationships
        $po->loadMissing(['supplier', 'fundCluster']);

        $fundClusterText = $po->fund_cluster_id
            ?: ($po->fundCluster?->fund_cluster_id ?? '');

        $responsibilityCenter = $fundClusterText;

        $orsBursNo = trim($po->ors_burs_no ?? '');
        $orsBursDate = $po->ors_burs_date;
        $orsBursDateStr = '';
        if (! empty($orsBursDate)) {
            try {
                $dateObj = $orsBursDate instanceof \DateTimeInterface
                    ? $orsBursDate
                    : Carbon::parse($orsBursDate);
                $orsBursDateStr = $dateObj->format('m/d/Y');
            } catch (\Throwable $e) {
                $orsBursDateStr = '';
            }
        }

        $orsBursText = $orsBursNo;
        if (! empty($orsBursDateStr)) {
            $orsBursText = ! empty($orsBursText)
                ? "{$orsBursText}\ndtd: {$orsBursDateStr}"
                : "dtd: {$orsBursDateStr}";
        }

        $supplierName = $po->supplier?->supplier_name ?? '';
        $supplierAddress = $po->supplier?->address ?? '';
        $poAmount = (float) ($po->total_amount_po ?? 0);

        // Neither has no LD, no retention: taxes are computed on PO amount directly
        $tax1 = round($poAmount / 1.12 * 0.01, 2);
        $tax5 = round($poAmount / 1.12 * 0.05, 2);
        $totalTax = round($tax1 + $tax5, 2);
        $finalPayable = max(0.0, round($poAmount - $totalTax, 2));
        $amountInWords = $this->amountToWords($finalPayable);

        $itemDescription = trim($po->item_description ?? '');
        if (empty($itemDescription)) {
            $itemDescription = 'ICT Equipment';
        } else {
            $itemDescription = preg_replace('/\s+/', ' ', $itemDescription);
        }

        if (file_exists($this->neitherTemplatePath)) {
            $spreadsheet = IOFactory::load($this->neitherTemplatePath);
            $sheet = $spreadsheet->getActiveSheet();

            // 1. Fund Cluster: Label in AA2, Value in AA4 (centered, bold)
            $sheet->setCellValue('AA2', 'Fund Cluster : ');
            if (! empty($fundClusterText)) {
                $sheet->setCellValue('AA4', $fundClusterText);
                $sheet->getStyle('AA4')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('AA4')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);
            } else {
                $sheet->setCellValue('AA4', null);
            }

            // 2. Payee (Supplier Name) in D11
            $sheet->setCellValue('D11', $supplierName);
            $sheet->getStyle('D11')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('D11')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 3. TIN/Employee No. (must remain empty in R12)
            $sheet->setCellValue('R12', null);

            // 4. ORS/BURS No. & Date in AA12
            $sheet->setCellValue('AA12', ! empty($orsBursText) ? $orsBursText : null);
            $sheet->getStyle('AA12')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('AA12')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                ->setVertical(Alignment::VERTICAL_CENTER);

            // 5. Address in D13
            $sheet->setCellValue('D13', $supplierAddress);
            $sheet->getStyle('D13')->getFont()->setName('Cambria')->setSize(10);
            $sheet->getStyle('D13')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 6. Particulars text in A17
            $particularsText = 'To payment for the purchase of '.$itemDescription.' amounting to...';
            $sheet->setCellValue('A17', $particularsText);
            $sheet->getStyle('A17')->getFont()->setName('Cambria')->setSize(9);
            $sheet->getStyle('A17')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);

            // 7. Responsibility Center in Q17
            if (! empty($responsibilityCenter)) {
                $sheet->setCellValue('Q17', $responsibilityCenter);
                $sheet->getStyle('Q17')->getFont()->setName('Cambria')->setSize(10);
                $sheet->getStyle('Q17')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('Q17', null);
            }

            // 8. MFO/PAP in V17 remains empty
            $sheet->setCellValue('V17', null);

            // 9. Calculation Rows
            $numFormat = '_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)';

            // K22: Gross Amount
            $sheet->setCellValue('K22', $poAmount > 0 ? $poAmount : null);
            $sheet->getStyle('K22')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K22')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K23: =K22
            $sheet->setCellValue('K23', '=K22');
            $sheet->getStyle('K23')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K23')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G24: Less tax 1% (=ROUND(K23/1.12*1%, 2))
            $sheet->setCellValue('G24', '=ROUND(K23/1.12*1%, 2)');
            $sheet->getStyle('G24')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G24')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G25: Less tax 5% (=ROUND(K23/1.12*5%, 2))
            $sheet->setCellValue('G25', '=ROUND(K23/1.12*5%, 2)');
            $sheet->getStyle('G25')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G25')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K25: Total Tax (=G24+G25)
            $sheet->setCellValue('K25', '=G24+G25');
            $sheet->getStyle('K25')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K25')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('K25:O25')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);

            // K26: Net Amount (=K23-K25)
            $sheet->setCellValue('K26', '=K23-K25');
            $sheet->getStyle('K26')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K26')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // AA18: Amount column in table (=K26)
            $sheet->setCellValue('AA18', '=K26');

            // AA29: Amount Due row (=AA18)
            $sheet->setCellValue('AA29', '=AA18');

            // 10. Section A: Certified - End User Printed Name & Position
            $endUser = trim($po->end_user ?? '');
            if (! empty($endUser)) {
                $endUserLines = array_map('trim', explode("\n", $endUser));
                $sheet->setCellValue('A34', $endUserLines[0]);
                $sheet->getStyle('A34')->getFont()->setName('Cambria')->setSize(10)->setBold(true)->setUnderline(true);
                $sheet->getStyle('A34')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);

                if (! empty($endUserLines[1])) {
                    $sheet->setCellValue('A35', $endUserLines[1]);
                    $sheet->getStyle('A35')->getFont()->setName('Cambria')->setSize(10);
                    $sheet->getStyle('A35')->getAlignment()
                        ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                        ->setVertical(Alignment::VERTICAL_BOTTOM);
                }
            } else {
                $sheet->setCellValue('A34', null);
                $sheet->setCellValue('A35', null);
            }

            // 11. Section D: Approved for Payment - Amount in Words
            if ($finalPayable > 0) {
                $sheet->setCellValue('R44', $amountInWords);
                $sheet->getStyle('R44')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R44')->getAlignment()
                    ->setWrapText(true)
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R44', null);
            }

            // 12. Section E: Receipt of Payment - Supplier Printed Name in R62
            $sheet->setCellValue('R61', 'Printed Name: ');
            if (! empty($supplierName)) {
                $sheet->setCellValue('R62', $supplierName);
                $sheet->getStyle('R62')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R62')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R62', null);
            }

            // Recalculate calculation cache
            Calculation::getInstance($spreadsheet)->disableCalculationCache();
            Calculation::getInstance($spreadsheet)->clearCalculationCache();

            // Page setup: A4 portrait fit to 1 page
            $sheet->getPageSetup()
                ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
                ->setPaperSize(PageSetup::PAPERSIZE_A4)
                ->setFitToWidth(1)
                ->setFitToHeight(1);

            $sheet->getPageMargins()
                ->setTop(0.4)
                ->setBottom(0.4)
                ->setLeft(0.35)
                ->setRight(0.35);

            $sheet->getPageSetup()->setPrintArea('A1:AF64');

            return $spreadsheet;
        }

        return $this->generateFallbackExcel($po);
    }

    /**
     * Generate an Excel spreadsheet Disbursement Voucher (Retention-Only Template).
     */
    public function generateRetentionOnlyExcel(ServePo $po, float $retentionAmount = 0.0): Spreadsheet
    {
        // Load relationships
        $po->loadMissing(['supplier', 'fundCluster']);

        $fundClusterText = $po->fund_cluster_id
            ?: ($po->fundCluster?->fund_cluster_id ?? '');

        $responsibilityCenter = $fundClusterText;

        $orsBursNo = trim($po->ors_burs_no ?? '');
        $orsBursDate = $po->ors_burs_date;
        $orsBursDateStr = '';
        if (! empty($orsBursDate)) {
            try {
                $dateObj = $orsBursDate instanceof \DateTimeInterface
                    ? $orsBursDate
                    : Carbon::parse($orsBursDate);
                $orsBursDateStr = $dateObj->format('m/d/Y');
            } catch (\Throwable $e) {
                $orsBursDateStr = '';
            }
        }

        $orsBursText = $orsBursNo;
        if (! empty($orsBursDateStr)) {
            $orsBursText = ! empty($orsBursText)
                ? "{$orsBursText}\ndtd: {$orsBursDateStr}"
                : "dtd: {$orsBursDateStr}";
        }

        $supplierName = $po->supplier?->supplier_name ?? '';
        $supplierAddress = $po->supplier?->address ?? '';
        $poAmount = (float) ($po->total_amount_po ?? 0);
        $onePercentRetention = round($poAmount * 0.01, 2);
        $retentionAmount = $retentionAmount > 0 ? min($retentionAmount, $poAmount) : $onePercentRetention;

        // Calculations for Amount in Words
        $afterRetention = max(0.0, round($poAmount - $retentionAmount, 2));
        $tax1 = round($afterRetention / 1.12 * 0.01, 2);
        $tax5 = round($afterRetention / 1.12 * 0.05, 2);
        $totalTax = round($tax1 + $tax5, 2);
        $finalPayable = max(0.0, round($afterRetention - $totalTax, 2));
        $amountInWords = $this->amountToWords($finalPayable);

        $itemDescription = trim($po->item_description ?? '');
        if (empty($itemDescription)) {
            $itemDescription = 'ICT Equipment';
        } else {
            $itemDescription = preg_replace('/\s+/', ' ', $itemDescription);
        }

        if (file_exists($this->retentionTemplatePath)) {
            $spreadsheet = IOFactory::load($this->retentionTemplatePath);
            $sheet = $spreadsheet->getActiveSheet();

            // 1. Fund Cluster: Label in AA2, Value in AA4 (centered, bold)
            $sheet->setCellValue('AA2', 'Fund Cluster : ');
            if (! empty($fundClusterText)) {
                $sheet->setCellValue('AA4', $fundClusterText);
                $sheet->getStyle('AA4')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('AA4')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);
            } else {
                $sheet->setCellValue('AA4', null);
            }

            // 2. Payee (Supplier Name) in D11
            $sheet->setCellValue('D11', $supplierName);
            $sheet->getStyle('D11')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('D11')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 3. TIN/Employee No. (must remain empty in R12)
            $sheet->setCellValue('R12', null);

            // 4. ORS/BURS No. & Date in AA12
            $sheet->setCellValue('AA12', ! empty($orsBursText) ? $orsBursText : null);
            $sheet->getStyle('AA12')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('AA12')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                ->setVertical(Alignment::VERTICAL_CENTER);

            // 5. Address in D13
            $sheet->setCellValue('D13', $supplierAddress);
            $sheet->getStyle('D13')->getFont()->setName('Cambria')->setSize(10);
            $sheet->getStyle('D13')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 6. Particulars text in A17
            $particularsText = 'To payment for the purchase of '.$itemDescription.' amounting to...';
            $sheet->setCellValue('A17', $particularsText);
            $sheet->getStyle('A17')->getFont()->setName('Cambria')->setSize(9);
            $sheet->getStyle('A17')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);

            // 7. Responsibility Center in Q17
            if (! empty($responsibilityCenter)) {
                $sheet->setCellValue('Q17', $responsibilityCenter);
                $sheet->getStyle('Q17')->getFont()->setName('Cambria')->setSize(10);
                $sheet->getStyle('Q17')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('Q17', null);
            }

            // 8. MFO/PAP in V17 remains empty
            $sheet->setCellValue('V17', null);

            // 9. Calculation Rows
            $numFormat = '_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)';

            // K22: Gross Amount
            $sheet->setCellValue('K22', $poAmount > 0 ? $poAmount : null);
            $sheet->getStyle('K22')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K22')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K23: Retention Amount (minus 1% live formula: =ROUND(K22*1%, 2))
            if ($retentionAmount > 0 && abs($retentionAmount - $onePercentRetention) > 0.001) {
                $sheet->setCellValue('K23', $retentionAmount);
            } else {
                $sheet->setCellValue('K23', '=ROUND(K22*1%, 2)');
            }
            $sheet->getStyle('K23')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K23')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('K23:O23')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);

            // K24: Amount after Retention (=K22-K23)
            $sheet->setCellValue('K24', '=K22-K23');
            $sheet->getStyle('K24')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K24')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G25: Less tax 1% (=ROUND(K24/1.12*1%, 2))
            $sheet->setCellValue('G25', '=ROUND(K24/1.12*1%, 2)');
            $sheet->getStyle('G25')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G25')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G26: Less tax 5% (=ROUND(K24/1.12*5%, 2))
            $sheet->setCellValue('G26', '=ROUND(K24/1.12*5%, 2)');
            $sheet->getStyle('G26')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G26')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K26: Total Tax (=G25+G26)
            $sheet->setCellValue('K26', '=G25+G26');
            $sheet->getStyle('K26')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K26')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('K26:O26')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);

            // K27: Net Amount (=K24-K26)
            $sheet->setCellValue('K27', '=K24-K26');
            $sheet->getStyle('K27')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K27')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // AA18: Amount column in table (=K27)
            $sheet->setCellValue('AA18', '=K27');

            // AA30: Amount Due row (=AA18)
            $sheet->setCellValue('AA30', '=AA18');

            // 10. Section A: Certified - End User Printed Name & Position
            $endUser = trim($po->end_user ?? '');
            if (! empty($endUser)) {
                $endUserLines = array_map('trim', explode("\n", $endUser));
                $sheet->setCellValue('A34', $endUserLines[0]);
                $sheet->getStyle('A34')->getFont()->setName('Cambria')->setSize(10)->setBold(true)->setUnderline(true);
                $sheet->getStyle('A34')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);

                if (! empty($endUserLines[1])) {
                    $sheet->setCellValue('A35', $endUserLines[1]);
                    $sheet->getStyle('A35')->getFont()->setName('Cambria')->setSize(10);
                    $sheet->getStyle('A35')->getAlignment()
                        ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                        ->setVertical(Alignment::VERTICAL_BOTTOM);
                }
            } else {
                $sheet->setCellValue('A34', null);
                $sheet->setCellValue('A35', null);
            }

            // 11. Section D: Approved for Payment - Amount in Words
            if ($finalPayable > 0) {
                $sheet->setCellValue('R44', $amountInWords);
                $sheet->getStyle('R44')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R44')->getAlignment()
                    ->setWrapText(true)
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R44', null);
            }

            // 12. Section E: Receipt of Payment - Supplier Printed Name in R62
            $sheet->setCellValue('R61', 'Printed Name: ');
            if (! empty($supplierName)) {
                $sheet->setCellValue('R62', $supplierName);
                $sheet->getStyle('R62')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R62')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R62', null);
            }

            // Recalculate calculation cache
            Calculation::getInstance($spreadsheet)->disableCalculationCache();
            Calculation::getInstance($spreadsheet)->clearCalculationCache();

            // Page setup: A4 portrait fit to 1 page
            $sheet->getPageSetup()
                ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
                ->setPaperSize(PageSetup::PAPERSIZE_A4)
                ->setFitToWidth(1)
                ->setFitToHeight(1);

            $sheet->getPageMargins()
                ->setTop(0.35)
                ->setBottom(0.35)
                ->setLeft(0.35)
                ->setRight(0.35);

            $sheet->getPageSetup()->setPrintArea('A1:AF64');

            return $spreadsheet;
        }

        return $this->generateFallbackExcel($po);
    }

    /**
     * Generate an Excel spreadsheet Disbursement Voucher (Both LD and Retention Template)
     * using the official reference template layout.
     */
    public function generateBothExcel(ServePo $po, float $ldAmount = 0.0, ?float $retentionAmount = null): Spreadsheet
    {
        // Load relationships
        $po->loadMissing(['supplier', 'fundCluster']);

        $fundClusterText = $po->fund_cluster_id
            ?: ($po->fundCluster?->fund_cluster_id ?? '');

        $responsibilityCenter = $fundClusterText;

        $orsBursNo = trim($po->ors_burs_no ?? '');
        $orsBursDate = $po->ors_burs_date;
        $orsBursDateStr = '';

        if (! empty($orsBursDate)) {
            try {
                $dateObj = $orsBursDate instanceof \DateTimeInterface
                    ? $orsBursDate
                    : Carbon::parse($orsBursDate);
                $orsBursDateStr = $dateObj->format('m/d/Y');
            } catch (\Throwable $e) {
                $orsBursDateStr = '';
            }
        }

        $orsBursText = $orsBursNo;
        if (! empty($orsBursDateStr)) {
            $orsBursText = ! empty($orsBursText)
                ? "{$orsBursText}\ndtd: {$orsBursDateStr}"
                : "dtd: {$orsBursDateStr}";
        }

        $supplierName = $po->supplier?->supplier_name ?? '';
        $supplierAddress = $po->supplier?->address ?? '';
        $poAmount = (float) ($po->total_amount_po ?? 0);
        $onePercentRetention = round($poAmount * 0.01, 2);
        $retentionAmount = ($retentionAmount !== null && $retentionAmount > 0)
            ? min($retentionAmount, $poAmount)
            : $onePercentRetention;
        $ldAmount = max(0.0, min($ldAmount, $poAmount));

        // Calculations for Amount in Words
        $afterDeductions = max(0.0, round($poAmount - $retentionAmount - $ldAmount, 2));
        $tax1 = round($afterDeductions / 1.12 * 0.01, 2);
        $tax5 = round($afterDeductions / 1.12 * 0.05, 2);
        $totalTax = round($tax1 + $tax5, 2);
        $finalPayable = max(0.0, round($afterDeductions - $totalTax, 2));
        $amountInWords = $this->amountToWords($finalPayable);

        $itemDescription = trim($po->item_description ?? '');
        if (empty($itemDescription)) {
            $itemDescription = 'ICT Equipment';
        } else {
            $itemDescription = preg_replace('/\s+/', ' ', $itemDescription);
        }

        $particularsLines = [
            "To payment for the purchase of {$itemDescription} amounting to...",
            '',
            '',
            'PO No. ' . ($po->po_number ?? ''),
        ];

        if (! empty($po->date_completed)) {
            $dcStr = $po->date_completed instanceof \DateTimeInterface
                ? $po->date_completed->format('F d, Y')
                : Carbon::parse($po->date_completed)->format('F d, Y');
            $particularsLines[] = "Date Completed: {$dcStr}";
        }

        $particularsText = implode("\n", $particularsLines);

        if (file_exists($this->bothTemplatePath)) {
            $spreadsheet = IOFactory::load($this->bothTemplatePath);
            $sheet = $spreadsheet->getActiveSheet();

            // 1. Fund Cluster: Label in AA2, Value in AA4 (centered, bold)
            $sheet->setCellValue('AA2', 'Fund Cluster : ');
            if (! empty($fundClusterText)) {
                $sheet->setCellValue('AA4', $fundClusterText);
                $sheet->getStyle('AA4')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('AA4')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);
            } else {
                $sheet->setCellValue('AA4', null);
            }

            // 2. Payee (Supplier Name) in D11
            $sheet->setCellValue('D11', $supplierName);
            $sheet->getStyle('D11')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('D11')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 3. TIN/Employee No. (must remain empty in R12)
            $sheet->setCellValue('R12', null);

            // 4. ORS/BURS No. & Date in AA12
            $sheet->setCellValue('AA12', ! empty($orsBursText) ? $orsBursText : null);
            $sheet->getStyle('AA12')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
            $sheet->getStyle('AA12')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                ->setVertical(Alignment::VERTICAL_CENTER);

            // 5. Address in D13
            $sheet->setCellValue('D13', $supplierAddress);
            $sheet->getStyle('D13')->getFont()->setName('Cambria')->setSize(10);
            $sheet->getStyle('D13')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // 6. Section B: Particulars in A17
            $sheet->setCellValue('A17', $particularsText);
            $sheet->getStyle('A17')->getFont()->setName('Cambria')->setSize(9);
            $sheet->getStyle('A17')->getAlignment()
                ->setWrapText(true)
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);

            // 7. Responsibility Center in Q17
            if (! empty($responsibilityCenter)) {
                $sheet->setCellValue('Q17', $responsibilityCenter);
                $sheet->getStyle('Q17')->getFont()->setName('Cambria')->setSize(10);
                $sheet->getStyle('Q17')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('Q17', null);
            }

            // 8. MFO/PAP in V17 remains empty
            $sheet->setCellValue('V17', null);

            // 9. Calculation Rows
            $numFormat = '_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)';

            // K22: Gross Amount
            $sheet->setCellValue('K22', $poAmount > 0 ? $poAmount : null);
            $sheet->getStyle('K22')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K22')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K23: Retention Amount (minus 1% live formula: =ROUND(K22*1%, 2))
            if ($retentionAmount > 0 && abs($retentionAmount - $onePercentRetention) > 0.001) {
                $sheet->setCellValue('K23', $retentionAmount);
            } else {
                $sheet->setCellValue('K23', '=ROUND(K22*1%, 2)');
            }
            $sheet->getStyle('K23')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K23')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K24: LD Amount with medium bottom border on K24:O24
            $sheet->setCellValue('K24', $ldAmount > 0 ? $ldAmount : ($poAmount > 0 ? 0.0 : null));
            $sheet->getStyle('K24')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K24')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('K24:O24')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);

            // K25: Amount after Retention and LD (=K22-K23-K24)
            $sheet->setCellValue('K25', '=K22-K23-K24');
            $sheet->getStyle('K25')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K25')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G26: Less tax 1% (=ROUND(K25/1.12*1%, 2))
            $sheet->setCellValue('G26', '=ROUND(K25/1.12*1%, 2)');
            $sheet->getStyle('G26')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G26')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // G27: Less tax 5% (=ROUND(K25/1.12*5%, 2))
            $sheet->setCellValue('G27', '=ROUND(K25/1.12*5%, 2)');
            $sheet->getStyle('G27')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('G27')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // K27: Total Tax (=G26+G27) with medium bottom border on K27:O27
            $sheet->setCellValue('K27', '=G26+G27');
            $sheet->getStyle('K27')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K27')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('K27:O27')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);

            // K28: Net Amount (=K25-K27)
            $sheet->setCellValue('K28', '=K25-K27');
            $sheet->getStyle('K28')->getNumberFormat()->setFormatCode($numFormat);
            $sheet->getStyle('K28')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // AA18: Amount column in table (=K28)
            $sheet->setCellValue('AA18', '=K28');

            // AA31: Amount Due row (=AA18)
            $sheet->setCellValue('AA31', '=AA18');

            // 10. Section A: Certified - End User Printed Name in A35 & Position in A36
            $endUser = trim($po->end_user ?? '');
            if (! empty($endUser)) {
                $endUserLines = array_map('trim', explode("\n", $endUser));
                $sheet->setCellValue('A35', $endUserLines[0]);
                $sheet->getStyle('A35')->getFont()->setName('Cambria')->setSize(10)->setBold(true)->setUnderline(true);
                $sheet->getStyle('A35')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_BOTTOM);

                if (! empty($endUserLines[1])) {
                    $sheet->setCellValue('A36', $endUserLines[1]);
                    $sheet->getStyle('A36')->getFont()->setName('Cambria')->setSize(10);
                    $sheet->getStyle('A36')->getAlignment()
                        ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                        ->setVertical(Alignment::VERTICAL_BOTTOM);
                }
            } else {
                $sheet->setCellValue('A35', null);
                $sheet->setCellValue('A36', null);
            }

            // 11. Section D: Approved for Payment - Amount in Words in R45
            if ($finalPayable > 0) {
                $sheet->setCellValue('R45', $amountInWords);
                $sheet->getStyle('R45')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R45')->getAlignment()
                    ->setWrapText(true)
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R45', null);
            }

            // 12. Section E: Receipt of Payment - Supplier Printed Name in R64
            $sheet->setCellValue('R63', 'Printed Name: ');
            if (! empty($supplierName)) {
                $sheet->setCellValue('R64', $supplierName);
                $sheet->getStyle('R64')->getFont()->setName('Cambria')->setSize(10)->setBold(true);
                $sheet->getStyle('R64')->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
            } else {
                $sheet->setCellValue('R64', null);
            }

            // Recalculate calculation cache
            Calculation::getInstance($spreadsheet)->disableCalculationCache();
            Calculation::getInstance($spreadsheet)->clearCalculationCache();

            // Page setup: A4 portrait fit to 1 page
            $sheet->getPageSetup()
                ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
                ->setPaperSize(PageSetup::PAPERSIZE_A4)
                ->setFitToWidth(1)
                ->setFitToHeight(1);

            $sheet->getPageMargins()
                ->setTop(0.35)
                ->setBottom(0.35)
                ->setLeft(0.35)
                ->setRight(0.35);

            $sheet->getPageSetup()->setPrintArea('A1:AF65');

            return $spreadsheet;
        }

        return $this->generateFallbackExcel($po, $ldAmount);
    }

    /**
     * Fallback generator in case template file is deleted.
     */
    protected function generateFallbackExcel(ServePo $po, float $ldAmount = 0.0): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Disbursement Voucher');

        $sheet->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
            ->setPaperSize(PageSetup::PAPERSIZE_A4)
            ->setFitToWidth(1)
            ->setFitToHeight(1);

        return $spreadsheet;
    }

    /**
     * Convert a numeric amount into words in Philippine Peso format.
     */
    public function amountToWords(float $amount): string
    {
        $pesos = (int) floor($amount);
        $centavos = (int) round(($amount - $pesos) * 100);

        if (class_exists('\NumberFormatter')) {
            $formatter = new \NumberFormatter('en_US', \NumberFormatter::SPELLOUT);
            $pesosWords = strtoupper($formatter->format($pesos));
        } else {
            $pesosWords = $this->fallbackNumberToWords($pesos);
        }

        if ($pesos > 0 && $centavos > 0) {
            return "{$pesosWords} PESOS & {$centavos}/100 ONLY.";
        } elseif ($pesos > 0 && $centavos === 0) {
            return "{$pesosWords} PESOS ONLY.";
        } elseif ($pesos === 0 && $centavos > 0) {
            return "ZERO PESOS & {$centavos}/100 ONLY.";
        }

        return 'ZERO PESOS ONLY.';
    }

    /**
     * Fallback pure-PHP number to words converter if ext-intl is unavailable.
     */
    private function fallbackNumberToWords(int $num): string
    {
        if ($num === 0) {
            return 'ZERO';
        }

        $ones = [
            1 => 'ONE', 2 => 'TWO', 3 => 'THREE', 4 => 'FOUR', 5 => 'FIVE',
            6 => 'SIX', 7 => 'SEVEN', 8 => 'EIGHT', 9 => 'NINE', 10 => 'TEN',
            11 => 'ELEVEN', 12 => 'TWELVE', 13 => 'THIRTEEN', 14 => 'FOURTEEN',
            15 => 'FIFTEEN', 16 => 'SIXTEEN', 17 => 'SEVENTEEN', 18 => 'EIGHTEEN',
            19 => 'NINETEEN',
        ];

        $tens = [
            2 => 'TWENTY', 3 => 'THIRTY', 4 => 'FORTY', 5 => 'FIFTY',
            6 => 'SIXTY', 7 => 'SEVENTY', 8 => 'EIGHTY', 9 => 'NINETY',
        ];

        $scales = [
            1000000000 => 'BILLION',
            1000000 => 'MILLION',
            1000 => 'THOUSAND',
            100 => 'HUNDRED',
        ];

        $words = [];

        foreach ($scales as $scale => $name) {
            if ($num >= $scale) {
                $count = (int) floor($num / $scale);
                $words[] = $this->fallbackNumberToWords($count).' '.$name;
                $num %= $scale;
            }
        }

        if ($num > 0) {
            if ($num < 20) {
                $words[] = $ones[$num];
            } else {
                $ten = (int) floor($num / 10);
                $one = $num % 10;
                $words[] = $tens[$ten].($one ? '-'.$ones[$one] : '');
            }
        }

        return implode(' ', $words);
    }
}
