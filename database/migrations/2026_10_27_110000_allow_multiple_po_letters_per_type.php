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
            $table->dropUnique('uq_po_letter_pk');
            $table->string('import_key', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        $hasDuplicateLetters = DB::table('po_letter_monitoring')
            ->select('po_number', 'type_of_letter')
            ->groupBy('po_number', 'type_of_letter')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicateLetters) {
            throw new RuntimeException(
                'Cannot restore one-letter-per-type constraint while duplicate PO letters exist.'
            );
        }

        Schema::table('po_letter_monitoring', function (Blueprint $table) {
            $table->dropUnique('po_letter_monitoring_import_key_unique');
            $table->dropColumn('import_key');
            $table->unique(['po_number', 'type_of_letter'], 'uq_po_letter_pk');
        });
    }
};
