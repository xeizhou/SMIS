<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            $table->string('po_vpad_forwarded_by', 255)->nullable()->after('po_received_date');
        });
    }

    public function down(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            $table->dropColumn('po_vpad_forwarded_by');
        });
    }
};
