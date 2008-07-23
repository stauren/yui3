<style type="text/css">
    #example-out .entry {
        font-family:courier;
        margin-top:2px;
        margin-left:10px;
    }

    #example-out .header {
        font-weight:bold;
        font-family:arial;
        color:#8dd5e7;
        margin-top:10px;
        margin-bottom:3px;
        margin-left:0px;
    }

    #example-out .subheader {
        font-weight:bold;
        font-family:arial;
        color:#EDFF9F;
    }

    #example-out {
        font-size:90%;
        margin-top:10px;
        border:1px solid #000;
        color:#ffffff;
        background-color:#004c6d;
        overflow:auto;
        width:30em;
        height:22em;
        padding:2px 5px;
    }
</style>
<script type="text/javascript">
    YUI.namespace("example");
    YUI.example.print = function(msg, cl) {
        var o = document.getElementById("example-out");
        if (o) {
            cl = cl || "";
            o.innerHTML += '<div class="entry ' + cl + '">' + msg + '</div>';
        }
    }
</script>