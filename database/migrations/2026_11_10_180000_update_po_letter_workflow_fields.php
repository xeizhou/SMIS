<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('po_letter_monitoring', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->change();
            $table->date('po_date')->nullable()->change();
            $table->string('office_end_user', 100)->nullable()->change();
            $table->string('type_of_letter', 100)->change();
        });
    }

    public function down(): void
    {
        $hasNullRequiredFields = DB::table('po_letter_monitoring')
            ->whereNull('supplier_id')
            ->orWhereNull('po_date')
            ->orWhereNull('office_end_user')
            ->exists();
        $hasUnsupportedTypes = DB::table('po_letter_monitoring')
            ->where('type_of_letter', 'RELEASE OF RETENTION')
            ->exists();

        if ($hasNullRequiredFields || $hasUnsupportedTypes) {
            throw new RuntimeException(
                'Cannot restore the required PO letter fields while nullable or release-of-retention records exist.'
            );
        }

        Schema::table('po_letter_monitoring', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable(false)->change();
            $table->date('po_date')->nullable(false)->change();
            $table->string('office_end_user', 100)->nullable(false)->change();
            $table->enum('type_of_letter', [
                'EXTENSION', 'WAIVER', 'CANCELLATION', 'REPLACEMENT/ALTERNATIVE OFFER',
            ])->change();
        });
    }
};
