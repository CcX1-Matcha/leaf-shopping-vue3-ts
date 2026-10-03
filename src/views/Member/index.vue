<script setup lang="ts"></script>

<template>
  <div class="container">
    <el-row class="nav" :gutter="20">
      <el-col :span="4">
        <el-menu
          active-text-color="#27ba9b"
          background-color="#fff"
          :default-active="$route.path"
          text-color="#999"
          router
          style="height: 600px"
        >
          <el-menu-item-group>
            <template #title>
              <p style="font-size: 18px; color: black">我的账户</p>
            </template>
            <el-menu-item index="/member">个人中心</el-menu-item>
          </el-menu-item-group>
          <el-menu-item-group>
            <template #title>
              <p style="font-size: 18px; color: black">交易管理</p>
            </template>
            <el-menu-item index="/member/order">我的订单</el-menu-item>
          </el-menu-item-group>
        </el-menu>
      </el-col>
      <el-col :span="20"><router-view></router-view></el-col>
    </el-row>
  </div>
</template>

<style scoped>
.container {
  margin-top: 20px;
}
</style>
