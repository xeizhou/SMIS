<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('regspi_monitoring', function (Blueprint $table) {
            $table->string('fund_cluster_id', 20)->nullable()->after('rrsp_no');

            $table->foreign('fund_cluster_id', 'fk_regspi_fund_cluster')
                ->references('fund_cluster_id')->on('fund_clusters')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('regspi_monitoring', function (Blueprint $table) {
            $table->dropForeign('fk_regspi_fund_cluster');
            $table->dropColumn('fund_cluster_id');
        });
    }
};
