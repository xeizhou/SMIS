<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pir_monitoring', function (Blueprint $table) {
            $table->date('po_vpad_notified_date')->nullable();
            $table->string('po_vpad_notified_via', 255)->nullable();
            $table->date('coa_stamp_notified_date')->nullable();
            $table->string('coa_stamp_notified_via', 255)->nullable();
            $table->date('receipt_claimed_notified_date')->nullable();
            $table->string('receipt_claimed_notified_via', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('pir_monitoring', function (Blueprint $table) {
            $table->dropColumn([
                'po_vpad_notified_date',
                'po_vpad_notified_via',
                'coa_stamp_notified_date',
                'coa_stamp_notified_via',
                'receipt_claimed_notified_date',
                'receipt_claimed_notified_via',
            ]);
        });
    }
};
