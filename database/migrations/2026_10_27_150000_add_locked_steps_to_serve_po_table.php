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
        if (! Schema::hasColumn('serve_po', 'locked_steps')) {
            Schema::table('serve_po', function (Blueprint $table) {
                $table->json('locked_steps')->nullable()->after('workflow_remarks');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('serve_po', 'locked_steps')) {
            Schema::table('serve_po', function (Blueprint $table) {
                $table->dropColumn('locked_steps');
            });
        }
    }
};
