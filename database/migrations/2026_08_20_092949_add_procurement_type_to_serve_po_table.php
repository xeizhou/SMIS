<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            $table->string('procurement_type', 20)->nullable()->after('philgeps_reference_no');
        });
    }

    public function down(): void
    {
        Schema::table('serve_po', function (Blueprint $table) {
            $table->dropColumn('procurement_type');
        });
    }
};