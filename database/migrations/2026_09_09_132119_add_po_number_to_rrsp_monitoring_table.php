<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('rrsp_monitoring', function (Blueprint $table) {
            $table->string('po_number')->nullable()->after('rrsp_no');
            
            $table->foreign('po_number')
                  ->references('po_number')
                  ->on('serve_po')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rrsp_monitoring', function (Blueprint $table) {
            $table->dropForeign(['po_number']);
            $table->dropColumn('po_number');
        });
    }
};
