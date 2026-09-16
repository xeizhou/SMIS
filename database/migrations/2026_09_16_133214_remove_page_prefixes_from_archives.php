<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $prefixes = [
            'RRSP - ',
            'RegSPI - ',
            'PO Letter - ',
            'Employee File - ',
            'Delivery - ',
            'Clearance - ',
            'Bona Vida - '
        ];

        foreach ($prefixes as $prefix) {
            DB::table('archives')
                ->where('identity_document', 'like', $prefix . '%')
                ->update([
                    'identity_document' => DB::raw("SUBSTRING(identity_document, " . (strlen($prefix) + 1) . ")")
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse operation because we can't reliably know what the original prefix was
    }
};
