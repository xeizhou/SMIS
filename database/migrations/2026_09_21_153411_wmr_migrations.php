<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * WMR Monitoring — one row per WMR (based on "WMR 2026.csv").
     *
     * The source sheet is a printed-form layout: each WMR spans ~6 spreadsheet
     * rows, so every field of that form becomes a column here.
     *
     * Notes on the shape:
     *  - Vehicle-only fields (fund, type, brand, model, plate, property no.,
     *    labor cost, office, ...) are nullable because non-vehicle WMRs exist
     *    (e.g. the laptop keyboard replacement).
     *  - fund_cluster_id (not fund_cluster) so the `fundCluster` relation doesn't
     *    serialize over the column in JSON.
     *  - invoice_no / invoice_date are plain strings because a WMR can cite
     *    several invoices ("19691, 19692" / "7/15/2026, 7/23/2026").
     *  - acquisition_date is a string because the sheet mixes a bare year
     *    ("2018") with full dates ("04/10/1996").
     *  - wmr_no is indexed, not unique: uniqueness is enforced in the
     *    controller against non-archived rows only, so a number can be reused
     *    after its record is archived.
     */
    public function up(): void
    {
        Schema::create('wmr_monitoring', function (Blueprint $table) {
            $table->id();

            // Header
            $table->string('wmr_no', 50)->index();
            $table->date('wmr_date');
            $table->foreignId('supplier_id')
                ->constrained('supplier_list', 'supplier_id')
                ->restrictOnDelete();
            $table->string('iar_no', 100)->nullable();
            $table->date('iar_date')->nullable();
            $table->string('item_vehicle', 255);

            // Job order
            $table->string('job_order_no', 100)->nullable();
            $table->date('job_order_date')->nullable();
            $table->string('fund_cluster_id', 20)->nullable();

            // Item / vehicle details
            $table->string('vehicle_type', 50)->nullable();
            $table->string('brand_name', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('plate_no', 50)->nullable();
            $table->string('serial_engine_no', 100)->nullable();
            $table->string('acquisition_date', 20)->nullable();
            $table->string('property_no', 100)->nullable();

            // Inspection & invoice
            $table->string('inspector_name', 150)->nullable();
            $table->date('inspection_date')->nullable();
            $table->string('invoice_no', 255)->nullable();
            $table->string('invoice_date', 255)->nullable();

            // Work done
            $table->text('defects_complaints')->nullable();
            $table->text('materials')->nullable();
            $table->decimal('labor_cost', 12, 2)->nullable();

            // Request / receipt
            $table->string('office_code', 20)->nullable();
            $table->string('requested_by', 150)->nullable();
            $table->string('received_by', 150)->nullable();
            $table->date('received_date')->nullable();
            $table->text('remarks')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('fund_cluster_id', 'fk_wmr_fund_cluster')
                ->references('fund_cluster_id')->on('fund_clusters')
                ->restrictOnDelete();

            $table->foreign('office_code', 'fk_wmr_office')
                ->references('office_code')->on('offices')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wmr_monitoring');
    }
};